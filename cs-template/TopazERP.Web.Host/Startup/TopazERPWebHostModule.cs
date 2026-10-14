using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Abp.Modules;
using Abp.Reflection.Extensions;
using TopazERP.Configuration;

namespace TopazERP.Web.Host.Startup
{
    [DependsOn(
       typeof(TopazERPWebCoreModule))]
    public class TopazERPWebHostModule: AbpModule
    {
        private readonly IWebHostEnvironment _env;
        private readonly IConfigurationRoot _appConfiguration;

        public TopazERPWebHostModule(IWebHostEnvironment env)
        {
            _env = env;
            _appConfiguration = env.GetAppConfiguration();
        }

        public override void Initialize()
        {
            IocManager.RegisterAssemblyByConvention(typeof(TopazERPWebHostModule).GetAssembly());
        }
    }
}
