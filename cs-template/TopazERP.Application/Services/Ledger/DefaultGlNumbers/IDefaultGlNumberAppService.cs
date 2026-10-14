using System.Threading.Tasks;
using TopazERP.Services.Ledger.DefaultGlNumbers.Dto;

namespace TopazERP.Services.Ledger.DefaultGlNumbers;

public interface IDefaultGlNumberAppService: Abp.Application.Services.IApplicationService
{
    Task<object> GetDefaultSetup();
    Task Create(CreateDefaultGlNumberInput input);
    Task Update(UpdateDefaultGlNumberInput input);
}