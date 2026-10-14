using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.Payments.Dto;

namespace TopazERP.Services.SchoolManager.Payments;

public interface IPaymentAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreatePaymentInput input);
    Task Update(UpdatePaymentInput input);
    Task Delete(Guid id);
    Task<object> ProcessPayments(List<Guid> paymentIds);
    Task<object> CancelPayments(List<Guid> paymentIds);
}