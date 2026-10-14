using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Ap.Reports.Dto;

namespace TopazERP.Pdf;

public interface IApInvoicePdfGenerator: IDomainService
{
    Task<byte[]> RenderPdf(InvoiceData invoice);
}