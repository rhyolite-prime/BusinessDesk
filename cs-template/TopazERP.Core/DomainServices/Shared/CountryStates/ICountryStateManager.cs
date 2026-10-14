using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.CountryStates
{
    public interface ICountryStateManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(CountryState input);
        Task Update(CountryState input);
        Task Delete(Guid Id);

    }
}
