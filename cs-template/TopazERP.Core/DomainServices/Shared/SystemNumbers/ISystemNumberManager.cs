using TopazERP.Models.Shared;
using System;

using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.SystemNumbers
{
   public interface ISystemNumberManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> GetInfoBySystemName(string systemName);
        Task<object> GetDetails(string moduleName, string itemName);
        Task<object> Create(SystemNumber input);
        Task Update(SystemNumber input);
        Task Delete(Guid id);
    }
}
