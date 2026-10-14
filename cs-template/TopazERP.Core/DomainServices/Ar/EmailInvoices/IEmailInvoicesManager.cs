using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;
using TopazERP.Notifications.Dto;

namespace TopazERP.DomainServices.Ar.EmailInvoices;

public interface IEmailInvoicesManager: Abp.Domain.Services.IDomainService
{
    Task SendWithCompanyCredentials(EmailMessage email, SmtpCredentials creds);
    Task<object> DispatchInvoice(EmailArInvoiceDto dto);
    Task<object> DispatchQuotation(EmailQuotationDto dto);
    Task<object> DispatchPaymentReceipt(EmailPaymentReceiptDto dto);
    
}