using TopazERP.Services.Shared.Currencies.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Currencies
{
   public interface ICurrencyAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateCurrencyInput input);
        Task Update(UpdateCurrencyInput input);
        Task Delete(Guid id);

    }
}
