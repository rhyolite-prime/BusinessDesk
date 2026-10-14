using TopazERP.DomainServices.Ap.ApInvoices.Dto;
using TopazERP.Services.Ap.ApInvoices.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ap.ApInvoices;

public interface IApInvoiceAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> PostInvoice(List<Guid> invoiceIds);
    //cancel invoice
    Task<object> CancelInvoice(List<Guid> invoiceIds);
    Task<object> Create(CreateInvoiceInput input);
    Task Update(UpdateInvoiceInput input);
    Task<object> EditPostedInvoice(UpdateInvoiceInput input);
    //approve invoice
    Task<object> ApproveInvoice(List<Guid> invoiceIds);
    // get invoice by id
    Task<ApInvoiceDto> GetById(Guid id);
    
}