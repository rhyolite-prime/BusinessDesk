using System.Threading.Tasks;
using Abp.Authorization;
using Abp.Runtime.Session;
using TopazERP.Configuration.Dto;

namespace TopazERP.Configuration
{
    [AbpAuthorize]
    public class ConfigurationAppService : TopazERPAppServiceBase, IConfigurationAppService
    {
        public async Task ChangeUiTheme(ChangeUiThemeInput input)
        {
            await SettingManager.ChangeSettingForUserAsync(AbpSession.ToUserIdentifier(), AppSettingNames.UiTheme, input.Theme);
        }
    }
}
