using Abp.Application.Services;
using TopazERP.Services.Ledger.BankAccounts.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.BankAccounts
{
    public interface IBankAccountAppService: IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateBankAccountInput input);
        Task Update(UpdateBankAccountInput input);
        Task Delete(Guid Id);

    }
}
