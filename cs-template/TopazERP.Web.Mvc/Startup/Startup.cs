using System;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Castle.Facilities.Logging;
using Abp.AspNetCore;
using Abp.AspNetCore.Mvc.Antiforgery;
using Abp.Castle.Logging.Log4Net;
using TopazERP.Authentication.JwtBearer;
using TopazERP.Configuration;
using TopazERP.Identity;
using TopazERP.Web.Resources;
using Abp.AspNetCore.SignalR.Hubs;
using Abp.Dependency;
using Abp.Json;
using Abp.Net.Mail;
using Abp.Net.Mail.Smtp;
using Akka.Actor;
using Akka.Routing;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.WebEncoders;
using Newtonsoft.Json.Serialization;
using HashidsNet;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using TopazERP.Actors;
using TopazERP.Actors.MessageModels;
using TopazERP.Pdf;
using SmtpEmailSender = TopazERP.Notifications.SmtpEmailSender;
using SmtpEmailSenderConfiguration = TopazERP.Notifications.SmtpEmailSenderConfiguration;

namespace TopazERP.Web.Startup
{
    public class Startup
    {
        private readonly IWebHostEnvironment _hostingEnvironment;
        private readonly IConfigurationRoot _appConfiguration;

        public Startup(IWebHostEnvironment env)
        {
            _hostingEnvironment = env;
            _appConfiguration = env.GetAppConfiguration();
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // MVC
            services.AddControllersWithViews(
                    options =>
                    {
                        options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute());
                        options.Filters.Add(new AbpAutoValidateAntiforgeryTokenAttribute());
                    }
                )
                .AddRazorRuntimeCompilation()
                .AddNewtonsoftJson(options =>
                {
                    options.SerializerSettings.ContractResolver = new AbpMvcContractResolver(IocManager.Instance)
                    {
                        NamingStrategy = new CamelCaseNamingStrategy()
                    };
                });

            IdentityRegistrar.Register(services);
            AuthConfigurer.Configure(services, _appConfiguration);

            services.Configure<WebEncoderOptions>(options =>
            {
                options.TextEncoderSettings = new TextEncoderSettings(UnicodeRanges.All);
            });
            
            services.AddHttpContextAccessor();
            
            services.AddScoped<IWebResourceManager, WebResourceManager>();
            services.AddSingleton<IHashids>(_ => new Hashids("2741b93b080c47f2bfec76acf3bb1b7a", 6));

            services.AddSignalR();
            
            
            // Register ActorSystem ...
            services.AddSingleton(_ => ActorSystem.Create($"DataProcessingActorSystem", ConfigurationLoader.Load()));

            
            services.AddSingleton<TopLevelActors.PayslipDispatchActorProvider>(provider =>
            {
                var actorSystem = provider.GetService<ActorSystem>();
                var payslipDispatchActor = actorSystem.ActorOf(Props.Create(() => new PayslipDispatchActor(provider)).WithRouter(new RoundRobinPool(50)));
                return () => payslipDispatchActor;
            });
            
            services.AddTransient<IEmailSender, SmtpEmailSender>();
            services.AddTransient<ISmtpEmailSenderConfiguration, SmtpEmailSenderConfiguration>();

            
            services.AddSingleton<IActionContextAccessor, ActionContextAccessor>();

           
            
            // Configure Abp and Dependency Injection
            services.AddAbpWithoutCreatingServiceProvider<TopazERPWebMvcModule>(
                // Configure Log4Net logging
                options => options.IocManager.IocContainer.AddFacility<LoggingFacility>(
                    f => f.UseAbpLog4Net().WithConfig(
                        _hostingEnvironment.IsDevelopment()
                            ? "log4net.config"
                            : "log4net.Production.config"
                        )
                )
            );
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, ILoggerFactory loggerFactory)
        {
            app.UseAbp(); // Initializes ABP framework.
            
            Syncfusion.Licensing.SyncfusionLicenseProvider.RegisterLicense("Mgo+DSMBMAY9C3t2VFhhQlJMfV5AQmBIYVp/TGpJfl96cVxMZVVBJAtUQF1hSn5XdkJjXX1XcH1RQWVY");


            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
            }

            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthentication();

            app.UseJwtTokenMiddleware();

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<AbpCommonHub>("/signalr");
                endpoints.MapControllerRoute("default", "{controller=Manage}/{action=Modules}/{id?}");
                endpoints.MapControllerRoute("defaultWithArea", "{area}/{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
