using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.BonusAndOnetimeAllowances
{
   public interface IBonusAndOnetimeAllowanceManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(int month, int year);
        Task Create(BonusAndOnetimeAllowance input);
        Task Update(BonusAndOnetimeAllowance input);
        Task Delete(Guid Id);
    }
}
