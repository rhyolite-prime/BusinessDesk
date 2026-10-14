using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Ar.Reports.Dto;

namespace TopazERP.Pdf;

public interface IQuotationPdfGenerator: IDomainService
{
    Task<byte[]> RenderPdf(QuotationData quotation);
}