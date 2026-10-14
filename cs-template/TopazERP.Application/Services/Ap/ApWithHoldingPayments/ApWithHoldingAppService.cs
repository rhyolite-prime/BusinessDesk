using AutoMapper;
using TopazERP.DomainServices.Ap.ApWithHoldings;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.ApWithHoldingPayments.Dto;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
namespace TopazERP.Services.Ap.ApWithHoldingPayments;

public class ApWithHoldingAppService: TopazERPAppServiceBase, IApWithHoldingAppService
{
    private readonly IApWithHoldingManager _apWithHoldingManager;
    private readonly IMapper _mapper;

    /// <summary>
    /// 
    /// </summary>
    /// <param name="apWithHoldingManager"></param>
    /// <param name="mapper"></param>
    public ApWithHoldingAppService(IApWithHoldingManager apWithHoldingManager, IMapper mapper)
    {
        _apWithHoldingManager = apWithHoldingManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _apWithHoldingManager.ListAll();
    }

    public async Task<object> Create(CreateApWithHoldingInput input)
    {
        var obj = _mapper.Map<ApWithHoldingPayment>(input);
        return await _apWithHoldingManager.Create(obj);
    }

    public async Task Update(UpdateApWithHoldingInput input)
    {
        var obj = _mapper.Map<ApWithHoldingPayment>(input);
        await _apWithHoldingManager.Update(obj);
        
    }
    
    public async Task<ApWithHoldingPayment> GetAsync(string SupplierName)
    {
        return await _apWithHoldingManager.GetAsync(SupplierName);
    }
    
    public async Task Delete(Guid Id)
    { 
        await _apWithHoldingManager.Delete(Id);
    }
    
    public async Task<object> PostWithHoldings(List<Guid> withHoldingIds)
    {
        return await _apWithHoldingManager.PostWithHoldings(withHoldingIds);
    }
   
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _apWithHoldingManager.GenerateBatchNumberAsync();
    }

}