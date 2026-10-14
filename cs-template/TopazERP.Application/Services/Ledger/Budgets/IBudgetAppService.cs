using System;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.DomainServices.Ledger.Budgets.Dto;
using TopazERP.Services.Ledger.Budgets.Dto;

namespace TopazERP.Services.Ledger.Budgets;

public interface IBudgetAppService: IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateBudgetInput input);
    Task Update(UpdateBudgetInput input);
    Task Delete(Guid id);
    //details
    Task<object> CreateBudgetDetail(BudgetDetailInput input);
    Task UpdateBudgetDetail(BudgetDetailInput input);
    Task DeleteBudgetDetail(BudgetDetailInput input);
}