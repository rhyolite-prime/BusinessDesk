using Abp.AutoMapper;
using Abp.Modules;
using Abp.Reflection.Extensions;
using TopazERP.Authorization;

namespace TopazERP
{
    [DependsOn(
        typeof(TopazERPCoreModule), 
        typeof(AbpAutoMapperModule))]
    public class TopazERPApplicationModule : AbpModule
    {
        public override void PreInitialize()
        {
            Configuration.Authorization.Providers.Add<TopazERPAuthorizationProvider>();
        }

        public override void Initialize()
        {
            var thisAssembly = typeof(TopazERPApplicationModule).GetAssembly();

            IocManager.RegisterAssemblyByConvention(thisAssembly);

            Configuration.Modules.AbpAutoMapper().Configurators.Add(
                // Scan the assembly for classes which inherit from AutoMapper.Profile
                cfg => cfg.AddMaps(thisAssembly)
            );
        }
    }
}
