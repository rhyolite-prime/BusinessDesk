using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ar.ArWithHoldings;
using TopazERP.Models.Ar;
using TopazERP.Services.Ar.ArWithHoldingPayments.Dto;

namespace TopazERP.Services.Ar.ArWithHoldingPayments;

public class ArWithHoldingAppService: TopazERPAppServiceBase, IArWithHoldingAppService
{
    private readonly IArWithHoldingManager _arWithHoldingManager;
    private readonly IMapper _mapper;
    
    public ArWithHoldingAppService(IArWithHoldingManager arWithHoldingManager, IMapper mapper)
    {
        _arWithHoldingManager = arWithHoldingManager;
        _mapper = mapper;
    }
    
    public async Task<object> ListAll()
    {
        return await _arWithHoldingManager.ListAll();
    }

    public async Task<object> Create(CreateArWithHoldingInput input)
    {
        var obj = _mapper.Map<ArWithholdingPayment>(input);
        return await _arWithHoldingManager.Create(obj);
    }

    public async Task Update(UpdateArWithHoldingInput input)
    {
        var obj = _mapper.Map<ArWithholdingPayment>(input);
        await _arWithHoldingManager.Update(obj);
        
    }
    
    public async Task<ArWithholdingPayment> GetAsync(string CustomerName)
    {
        return await _arWithHoldingManager.GetAsync(CustomerName);
    }
    
    public async Task Delete(Guid Id)
    { 
        await _arWithHoldingManager.Delete(Id);
    }
    
    public async Task<object> PostWithHoldings(List<Guid> withHoldingIds)
    {
        return await _arWithHoldingManager.PostWithHoldings(withHoldingIds);
    }
    
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _arWithHoldingManager.GenerateBatchNumberAsync();
    }
}