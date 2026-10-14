using TopazERP.Models.Shared;
using System;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Countries
{
   public interface ICountryManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(Country input);
        Task<Country> GetNationality(string nationality);
        Task Update(Country input);
        Task Delete(Guid id);
    }
}
