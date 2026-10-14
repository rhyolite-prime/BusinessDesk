using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ap;

namespace TopazERP.DomainServices.Ap.ApPayments
{
   public interface IApPaymentManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<ApInvoice> GetAsync(string SupplierName);
        Task<object> PostPayments(List<Guid> paymentIds);
        Task<object> Create(ApPayment input);
        Task Update(ApPayment input);
        Task<object> Delete(Guid id);
        //cancel payment
        Task<object> CancelPayment(List<Guid> paymentIds);
        Task<string> GenerateBatchNumberAsync();
        // get payment records
        Task<object> ListAllPaymentRecords();
    }
}
