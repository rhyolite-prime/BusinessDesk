using AutoMapper;
using TopazERP.DomainServices.Ap.ApVouchers;
using TopazERP.DomainServices.Ap.ApVouchers.Dto;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.ApVouchers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace TopazERP.Services.Ap.ApVouchers;

public class ApVoucherAppService: TopazERPAppServiceBase, IApVoucherAppService
{
    private readonly IApVoucherManager _apVoucherManager;
    private readonly IMapper _mapper;

    public ApVoucherAppService(IApVoucherManager apVoucherManager, IMapper mapper)
    {
        _apVoucherManager = apVoucherManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _apVoucherManager.ListAll();
    }

    public async Task<object> Create(CreateApVoucherInput input)
    {
        var obj = _mapper.Map<ApVoucher>(input);
        return await _apVoucherManager.Create(obj);
    }
    
    public async Task Update(UpdateApVoucherInput input)
    {
        var obj = _mapper.Map<ApVoucher>(input);
        await _apVoucherManager.Update(obj);
    }

    public async Task Delete(Guid Id)
    {   
        await _apVoucherManager.Delete(Id);
    }
    
    public async Task<object> DeleteMultiple(List<Guid> ids)
    {
        return await _apVoucherManager.DeleteMultiple(ids);
    }
    
    public async Task<object> PostVouchers(List<Guid> voucherIds)
    {
        return await _apVoucherManager.PostVouchers(voucherIds);
    }
    
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _apVoucherManager.GenerateBatchNumberAsync();
    }
    
    
    
}
