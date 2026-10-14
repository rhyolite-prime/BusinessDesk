using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Services.Ar.ArInvoices.Dto;

namespace TopazERP.Services.Ar.ArInvoices;

public interface IArInvoiceAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> PostInvoice(List<Guid> invoiceIds);
    //cancel invoice
    Task<object> CancelInvoice(List<Guid> invoiceIds);
    Task<object> Create(CreateArInvoiceInput input);
    Task Update(UpdateArInvoiceInput input);
    Task<object> EditPostedInvoice(UpdateArInvoiceInput input);
    
    // approve invoices
    Task<object> ApproveInvoice(List<Guid> invoiceIds);
    
}