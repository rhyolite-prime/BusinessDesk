using AutoMapper;
using TopazERP.DomainServices.Ar.ArOpeningBalances;
using TopazERP.Models.Ar;
using TopazERP.Services.Ap.OpeningBalances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Castle.Facilities.TypedFactory.Internal;
using Microsoft.Extensions.Logging;


namespace TopazERP.Services.Ar.OpeningBalances.Dto;

public class ArOpeningBalanceAppService: TopazERPAppServiceBase, IArOpeningBalanceAppService 
{
    private readonly IArOpeningBalanceManager _arOpeningBalanceManager;
    private readonly IMapper _mapper;
    private readonly ILogger<ArOpeningBalanceAppService> _logger;

    public ArOpeningBalanceAppService(IArOpeningBalanceManager arOpeningBalanceManager, IMapper mapper, ILogger<ArOpeningBalanceAppService> logger)
    {
        _arOpeningBalanceManager = arOpeningBalanceManager;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<object> Create(CreateArOpeningBalanceInput input)
    {
        var obj = _mapper.Map<ArOpeningBalance>(input);
        return await _arOpeningBalanceManager.Create(obj);
    }

    public async Task Update(UpdateArOpeningBalanceInput input)
    {
        var obj = _mapper.Map<ArOpeningBalance>(input);
        await _arOpeningBalanceManager.Update(obj);
    }

    public async Task<object> ListAll()
    {
        return await _arOpeningBalanceManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _arOpeningBalanceManager.Delete(id);
    }
    
    
    public async Task<object> GetPostedOpeningBalances()
    {
        return await _arOpeningBalanceManager.GetPostedOpeningBalances();
    }

    public async Task<object> PostArOpeningBalances(List<Guid> balanceIds)
    {
        return await _arOpeningBalanceManager.PostArOpeningBalances(balanceIds);
    }

    public async Task<object> GetAsync(string customerName, string currencyName)
    {
        return await _arOpeningBalanceManager.GetAsync(customerName, currencyName);
    }
    
    public async Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName)
    {
        return await _arOpeningBalanceManager.GetOuIdByHierarchyAsync(hierarchyName);
    }
    
}