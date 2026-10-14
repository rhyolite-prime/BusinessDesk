using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;

namespace TopazERP.Services.Ar.EmailInvoices;

public interface IEmailInvoicesAppService: Abp.Application.Services.IApplicationService
{
    Task<object> DispatchInvoice(EmailArInvoiceDto dto);
    Task<object> DispatchQuotation(EmailQuotationDto dto);
    Task<object> DispatchPaymentReceipt(EmailPaymentReceiptDto dto);
}