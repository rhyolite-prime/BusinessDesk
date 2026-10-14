using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Payments;

public interface IPaymentManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(SchPayment payment);
    Task Update(SchPayment payment);
    Task Delete(Guid id);
    Task<object> ProcessPayments(List<Guid> paymentIds);
    Task<object> CancelPayments(List<Guid> paymentIds);
}