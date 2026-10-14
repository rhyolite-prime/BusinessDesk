using TopazERP.Services.Ap.ApPayment.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ap.ApPayment;

public interface IApPaymentAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateApPaymentInput input);
    Task Update(UpdateApPaymentInput input);
    Task<object> Delete(Guid Id);
    
    Task<object> PostPayments(List<Guid> paymentIds);
    Task<object> CancelPayment(List<Guid> paymentIds);
    Task<string> GenerateBatchNumberAsync();
    Task<object> ListAllPaymentRecords();
    
}
