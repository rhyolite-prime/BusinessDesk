using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Ar;
using TopazERP.Services.Ap.ApPayment.Dto;
using TopazERP.Services.Ar.ArPayments.Dto;

namespace TopazERP.Services.Ar.ArPayments;

public interface IArPaymentAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateArPaymentInput input);
    Task<ArInvoice> GetAsync(string customerName);
    Task Update(UpdateArPaymentInput input);
    Task<object> Delete(Guid Id);
    Task<object> PostPayments(List<Guid> paymentIds);
    Task<object> CancelPayment(List<Guid> paymentIds);
    Task<string> GenerateBatchNumberAsync();
    Task<object> ListAllPaymentRecords();
}