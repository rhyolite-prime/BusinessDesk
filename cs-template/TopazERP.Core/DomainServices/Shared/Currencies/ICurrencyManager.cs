using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Currencies
{
   public interface ICurrencyManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<Currency> GetAsync(string currencyName);
        Task<object> Create(Currency input);
        Task Update(Currency input);
        Task Delete(Guid Id);
    }
}
