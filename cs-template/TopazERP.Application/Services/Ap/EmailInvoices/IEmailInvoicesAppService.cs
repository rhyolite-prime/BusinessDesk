using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;
using TopazERP.Notifications.Dto;

namespace TopazERP.Services.Ap.EmailInvoices;

public interface IEmailInvoicesAppService: Abp.Application.Services.IApplicationService
{
    
    Task<object> DispatchInvoice(EmailApInvoiceDto dto);
    
}