using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.AccountingPeriods
{
   public interface IAccountingPeriodManager : Abp.Domain.Services.IDomainService
   {
       Task Close(AccountingPeriod period);
       Task ReopenClosedPeriod(Guid id);
       Task Reopen(int month, int year);
       Task<object> GetLastClosedPeriod();

   }
}
