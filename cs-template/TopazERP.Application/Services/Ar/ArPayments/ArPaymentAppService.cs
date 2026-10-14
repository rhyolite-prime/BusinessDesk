using AutoMapper;
using TopazERP.DomainServices.Ar.ArPayments;
using TopazERP.Models.Ar;
using TopazERP.Services.Ar.ArPayments.Dto;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;


namespace TopazERP.Services.Ar.ArPayments;

public class ArPaymentAppService: TopazERPAppServiceBase, IArPaymentAppService
{
    private readonly IArPaymentManager _arPaymentManager;
    private readonly IMapper _mapper;
    
    public ArPaymentAppService(IArPaymentManager arPaymentManager, IMapper mapper)
    {
        _arPaymentManager = arPaymentManager;
        _mapper = mapper;
    }
    
    public async Task<object> ListAll()
    {
        return await _arPaymentManager.ListAll();
    }

    public async Task<object> Create(CreateArPaymentInput input)
    {
        var obj = _mapper.Map<Models.Ar.ArPayment>(input);
        return await _arPaymentManager.Create(obj);
    }

    public async Task Update(UpdateArPaymentInput input)
    {
        var obj = _mapper.Map<Models.Ar.ArPayment>(input);
        await _arPaymentManager.Update(obj);
        
    }
    
    public async Task<object> Delete(Guid Id)
    {
        return await _arPaymentManager.Delete(Id);
    }
    
    public async Task<object> PostPayments(List<Guid> paymentIds)
    {
        return await _arPaymentManager.PostPayments(paymentIds);
    }
    
    public async Task<object> CancelPayment(List<Guid> paymentIds)
    {
        return await _arPaymentManager.CancelPayment(paymentIds);
    }
    
    public async Task<ArInvoice> GetAsync(string customerName)
    {
        return await _arPaymentManager.GetAsync(customerName);
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _arPaymentManager.GenerateBatchNumberAsync();
    }
    
    public async Task<object> ListAllPaymentRecords()
    {
        return await _arPaymentManager.ListAllPaymentRecords();
    }
}