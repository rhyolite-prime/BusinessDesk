using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.BankAccounts
{
   public interface IBankAccountManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(BankAccount input);
        Task Update(BankAccount input);
        Task Delete(Guid Id);
    }
}
