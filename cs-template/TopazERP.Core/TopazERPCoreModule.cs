using Abp.Dependency;
using Abp.Localization;
using Abp.Modules;
using Abp.Reflection.Extensions;
using Abp.Runtime.Security;
using Abp.Timing;
using Abp.Zero;
using Abp.Zero.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using TopazERP.Authorization.Roles;
using TopazERP.Authorization.Users;
using TopazERP.Configuration;
using TopazERP.Localization;
using TopazERP.MultiTenancy;
using TopazERP.Notifications;
using TopazERP.Pdf;
using TopazERP.Timing;

namespace TopazERP
{
    [DependsOn(typeof(AbpZeroCoreModule))]
    public class TopazERPCoreModule : AbpModule
    {
        public override void PreInitialize()
        {
            Configuration.Auditing.IsEnabledForAnonymousUsers = true;

            // Declare entity types
            Configuration.Modules.Zero().EntityTypes.Tenant = typeof(Tenant);
            Configuration.Modules.Zero().EntityTypes.Role = typeof(Role);
            Configuration.Modules.Zero().EntityTypes.User = typeof(User);

            TopazERPLocalizationConfigurer.Configure(Configuration.Localization);

            // Enable this line to create a multi-tenant application.
            Configuration.MultiTenancy.IsEnabled = TopazERPConsts.MultiTenancyEnabled;

            // Configure roles
            AppRoleConfig.Configure(Configuration.Modules.Zero().RoleManagement);

            Configuration.Settings.Providers.Add<AppSettingProvider>();
            
            Configuration.Localization.Languages.Add(new LanguageInfo("fa", "فارسی", "famfamfam-flags ir"));
            
            Configuration.Settings.SettingEncryptionConfiguration.DefaultPassPhrase = TopazERPConsts.DefaultPassPhrase;
            SimpleStringCipher.DefaultPassPhrase = TopazERPConsts.DefaultPassPhrase;
            
            IocManager.Register<ICustomEmailSender, CustomEmailSender>(DependencyLifeStyle.Transient);
            
            IocManager.Register<IHttpContextAccessor, IHttpContextAccessor>();
            
             


             
        }

        public override void Initialize()
        {
            IocManager.RegisterAssemblyByConvention(typeof(TopazERPCoreModule).GetAssembly());
        }

        public override void PostInitialize()
        {
            IocManager.Resolve<AppTimes>().StartupTime = Clock.Now;
        }
    }
}
