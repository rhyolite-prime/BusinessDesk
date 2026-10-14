using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.PaymentMethods;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.PaymentMethods.Dto;

namespace TopazERP.Services.SchoolManager.PaymentMethods;

public class PaymentMethodAppService : TopazERPAppServiceBase, IPaymentMethodAppService
{
    private readonly IPaymentMethodManager _paymentMethodManager;
    private readonly IMapper _mapper;

    public PaymentMethodAppService(IPaymentMethodManager paymentMethodManager, IMapper mapper)
    {
        _paymentMethodManager = paymentMethodManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreatePaymentMethodInput input)
    {
        var entity = _mapper.Map<PaymentMethod>(input);
        return await _paymentMethodManager.Create(entity);
    }

    public async Task Update(UpdatePaymentMethodInput input)
    {
        var entity = _mapper.Map<PaymentMethod>(input);
        await _paymentMethodManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _paymentMethodManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _paymentMethodManager.Delete(id);
    }
}