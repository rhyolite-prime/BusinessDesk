using AutoMapper;
using TopazERP.DomainServices.Ap.ApPayments;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.ApPayment.Dto;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;



namespace TopazERP.Services.Ap.ApPayment;

public class ApPaymentAppService: TopazERPAppServiceBase, IApPaymentAppService
{
    private readonly IApPaymentManager _apPaymentManager;
    private readonly IMapper _mapper;

    public ApPaymentAppService(IApPaymentManager apPaymentManager, IMapper mapper)
    {
        _apPaymentManager = apPaymentManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _apPaymentManager.ListAll();
    }

    public async Task<object> Create(CreateApPaymentInput input)
    {
        var obj = _mapper.Map<Models.Ap.ApPayment>(input);
        return await _apPaymentManager.Create(obj);
    }

    public async Task Update(UpdateApPaymentInput input)
    {
        var obj = _mapper.Map<Models.Ap.ApPayment>(input);
        await _apPaymentManager.Update(obj);
        
    }
    
    public async Task<object> Delete(Guid Id)
    {
        return await _apPaymentManager.Delete(Id);
    }
    
    public async Task<object> PostPayments(List<Guid> paymentIds)
    {
        return await _apPaymentManager.PostPayments(paymentIds);
    }
    
    public async Task<object> CancelPayment(List<Guid> paymentIds)
    {
        return await _apPaymentManager.CancelPayment(paymentIds);
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _apPaymentManager.GenerateBatchNumberAsync();
    }
    public async Task<object> ListAllPaymentRecords()
    {
        return await _apPaymentManager.ListAllPaymentRecords();
    }
}
