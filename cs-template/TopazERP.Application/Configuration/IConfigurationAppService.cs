using System.Threading.Tasks;
using TopazERP.Configuration.Dto;

namespace TopazERP.Configuration
{
    public interface IConfigurationAppService
    {
        Task ChangeUiTheme(ChangeUiThemeInput input);
    }
}
