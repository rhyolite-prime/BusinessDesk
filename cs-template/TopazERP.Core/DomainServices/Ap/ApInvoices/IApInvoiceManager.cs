using TopazERP.DomainServices.Ap.ApInvoices.Dto;
using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ap.ApInvoices
{
   public interface IApInvoiceManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> PostInvoice(List<Guid> invoiceIds);
        //cancel invoice
        Task<object> CancelInvoice(List<Guid> invoiceIds);
        Task<object> Create(ApInvoice input);
        Task<ApInvoice> GetAsync(string SupplierName);
        Task<object> Update(ApInvoice input);
        Task<object> EditPostedInvoice(ApInvoice input);
        
        //approve invoice
        Task<object>ApproveInvoice(List<Guid> invoiceIds);
        // get invoice by id
        Task<ApInvoice> GetById(Guid id);

    }
}
