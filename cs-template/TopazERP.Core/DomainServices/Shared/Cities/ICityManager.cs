using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Cities
{
    public interface ICityManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(City input);
        Task Update(City input);
        Task Delete(Guid Id);
    }
}
