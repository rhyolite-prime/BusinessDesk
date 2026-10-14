using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;
using TopazERP.Notifications.Dto;

namespace TopazERP.DomainServices.Ap.EmailInvoices;

public interface IEmailInvoicesManager: Abp.Domain.Services.IDomainService
{
    Task SendWithCompanyCredentials(EmailMessage email, SmtpCredentials creds);
    Task<object> DispatchInvoice(EmailApInvoiceDto dto);
    
}