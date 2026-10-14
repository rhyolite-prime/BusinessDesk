using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ar.Reports.Dto;

namespace TopazERP.Pdf;

public interface IReceiptPdfGenerator
{
    Task<byte[]> RenderPdf(List<PaymentReceipts> receipts);
}