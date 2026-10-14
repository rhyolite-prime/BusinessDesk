using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Budgets.Dto;

namespace TopazERP.DomainServices.Ledger.Budgets
{
   public interface IBudgetManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(Budget input);
        Task Update(Budget input);
        Task Delete(Guid id);
        
        //details
        Task<object> CreateBudgetDetail(BudgetDetailInput input);
        Task UpdateBudgetDetail(BudgetDetailInput input);
        Task DeleteBudgetDetail(BudgetDetailInput input);
    }
}
