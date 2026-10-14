using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ar;

namespace TopazERP.DomainServices.Ar.ArPayments
{
   public interface IArPaymentManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<ArInvoice> GetAsync(string customerName);
        Task<object> PostPayments(List<Guid> paymentIds);
        Task<object> Create(ArPayment input);
        Task Update(ArPayment input);
        Task<object> Delete(Guid id);
        //cancel payment
        Task<object> CancelPayment(List<Guid> paymentIds);
        Task<string> GenerateBatchNumberAsync();
        Task<object> ListAllPaymentRecords();
    }
}
