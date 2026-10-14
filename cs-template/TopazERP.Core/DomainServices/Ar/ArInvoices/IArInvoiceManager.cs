using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ar.ArInvoices
{
   public interface IArInvoiceManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> PostInvoice(List<Guid> invoiceIds);
        //cancel invoice
        Task<object> CancelInvoice(List<Guid> invoiceIds);
        Task<object> Create(ArInvoice input);
        Task<ArInvoice> GetAsync(string customerName);
        Task<object> Update(ArInvoice input);
        Task<object> EditPostedInvoice(ArInvoice input);
        // approve invoice
        Task<object> ApproveInvoice(List<Guid> invoiceIds);
    }
}
