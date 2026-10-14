using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Payments;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Payments.Dto;

namespace TopazERP.Services.SchoolManager.Payments;

public class PaymentAppService : TopazERPAppServiceBase, IPaymentAppService
{
    private readonly IPaymentManager _paymentManager;
    private readonly IMapper _mapper;

    public PaymentAppService(IPaymentManager paymentManager, IMapper mapper)
    {
        _paymentManager = paymentManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreatePaymentInput input)
    {
        var entity = _mapper.Map<SchPayment>(input);
        return await _paymentManager.Create(entity);
        
    }

    public async Task Update(UpdatePaymentInput input)
    {
        var entity = _mapper.Map<SchPayment>(input);
        await _paymentManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _paymentManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _paymentManager.Delete(id);
    }
    public async Task<object> CancelPayments(List<Guid> paymentIds)
    {
        return await _paymentManager.CancelPayments(paymentIds);
    }
    public async Task<object> ProcessPayments(List<Guid> paymentIds)
    {
        return await _paymentManager.ProcessPayments(paymentIds);
    }
}
