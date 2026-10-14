using AutoMapper;
using TopazERP.DomainServices.Ap.OpeningBalances;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.OpeningBalances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Castle.Facilities.TypedFactory.Internal;
using Microsoft.Extensions.Logging;
using TopazERP.DomainServices.Shared.Suppliers;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.DomainServices.Shared.Departments;

namespace TopazERP.Services.Ap.OpeningBalances;

public class OpeningBalanceAppService: TopazERPAppServiceBase, IOpeningBalanceAppService
{
    private readonly IOpeningBalanceManager _openingBalanceManager;
    private readonly ISupplierManager _supplierManager;
    private readonly ICurrencyManager _currencyManager;
    private readonly IDepartmentManager _departmentManager;
    private readonly IMapper _mapper;
    private readonly ILogger<OpeningBalanceAppService> _logger;

    public OpeningBalanceAppService(IOpeningBalanceManager openingBalanceManager, IMapper mapper, ILogger<OpeningBalanceAppService> logger)
    {
        _openingBalanceManager = openingBalanceManager;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<object> Create(CreateOpeningBalanceInput input)
    {
        var obj = _mapper.Map<ApOpeningBalance>(input);
        return await _openingBalanceManager.Create(obj);
    }

    public async Task Update(UpdateOpeningBalanceInput input)
    {
        var obj = _mapper.Map<ApOpeningBalance>(input);
        await _openingBalanceManager.Update(obj);
    }

    public async Task<object> ListAll()
    {
        return await _openingBalanceManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _openingBalanceManager.Delete(id);
    }
    
    
    public async Task<object> GetPostedOpeningBalances()
    {
        return await _openingBalanceManager.GetPostedOpeningBalances();
    }
    
    public async Task<object> PostOpeningBalances(List<Guid> balanceIds)
    {
        return await _openingBalanceManager.PostOpeningBalances(balanceIds);
    }
    
    public async Task<object> GetAsync(string supplierName, string currencyName)
    {
        return await _openingBalanceManager.GetAsync(supplierName, currencyName);
    }
    public async Task<object> GetOuHierarchy()
    {
        return await _openingBalanceManager.GetOuHierarchy();
    }
    public async Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName)
    {
        return await _openingBalanceManager.GetOuIdByHierarchyAsync(hierarchyName);
    }
}
