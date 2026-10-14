using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Budgets;
using TopazERP.DomainServices.Ledger.Budgets.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Budgets.Dto;

namespace TopazERP.Services.Ledger.Budgets;

public class BudgetAppService: TopazERPAppServiceBase, IBudgetAppService
{
    private readonly IBudgetManager _budgetManager;
    private readonly IMapper _mapper;

    public BudgetAppService(IBudgetManager budgetManager, IMapper mapper)
    {
        _budgetManager = budgetManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _budgetManager.ListAll();
    }
    
    public async Task<object> Create(CreateBudgetInput input)
    {
        var obj = _mapper.Map<Budget>(input);
        return await _budgetManager.Create(obj);
    }

    public async Task Update(UpdateBudgetInput input)
    {
        var obj = _mapper.Map<Budget>(input);
        await _budgetManager.Update(obj);
    }

    public async Task Delete(Guid Id)
    {
        await _budgetManager.Delete(Id);
    }
    
    //
    public async Task<object> CreateBudgetDetail(BudgetDetailInput input)
    {
        return await _budgetManager.CreateBudgetDetail(input);
    }

    public async Task UpdateBudgetDetail(BudgetDetailInput input)
    {
        await _budgetManager.UpdateBudgetDetail(input);
    }

    public async Task DeleteBudgetDetail(BudgetDetailInput input)
    {
        await _budgetManager.DeleteBudgetDetail(input);
    }
}