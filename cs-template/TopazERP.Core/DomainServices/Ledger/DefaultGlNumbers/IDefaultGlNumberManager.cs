using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.DefaultGlNumbers;

public interface IDefaultGlNumberManager: Abp.Domain.Services.IDomainService
{
    Task<object> GetDefaultSetup();
    Task Create(DefaultGlNumber input);
    Task Update(DefaultGlNumber input);
}