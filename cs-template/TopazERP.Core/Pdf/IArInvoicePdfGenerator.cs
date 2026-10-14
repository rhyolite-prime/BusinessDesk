using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Ar.Reports.Dto;

namespace TopazERP.Pdf;

public interface IArInvoicePdfGenerator: IDomainService
{
    Task<byte[]> RenderPdf(InvoiceData invoice);
}
