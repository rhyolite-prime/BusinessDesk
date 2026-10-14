using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PaymentMethods;

public interface IPaymentMethodManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(PaymentMethod paymentMethod);
    Task Update(PaymentMethod paymentMethod);
    Task Delete(Guid id);
}