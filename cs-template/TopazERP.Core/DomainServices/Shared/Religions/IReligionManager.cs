using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Religions
{
   public interface IReligionManager: Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(Religion input);
        Task<Religion> GetAsync(string name);
        Task Update(Religion input);
        Task Delete(Guid Id);
    }
}
