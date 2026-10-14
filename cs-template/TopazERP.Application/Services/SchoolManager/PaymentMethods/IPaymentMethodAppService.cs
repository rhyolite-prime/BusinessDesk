using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.PaymentMethods.Dto;

namespace TopazERP.Services.SchoolManager.PaymentMethods;

public interface IPaymentMethodAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreatePaymentMethodInput input);
    Task Update(UpdatePaymentMethodInput input);
    Task Delete(Guid id);
}