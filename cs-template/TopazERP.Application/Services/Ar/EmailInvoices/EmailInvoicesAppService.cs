using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Ar.EmailInvoices;
using TopazERP.DomainServices.Ar.Reports;

namespace TopazERP.Services.Ar.EmailInvoices;

public class EmailInvoicesAppService: TopazERPAppServiceBase, IEmailInvoicesAppService
{
    private readonly IArReportManager _arReportManager;
    private readonly IEmailInvoicesManager _emailInvoicesManager;
    public EmailInvoicesAppService(IArReportManager arReportManager, IEmailInvoicesManager emailInvoicesManager)
    {
        _arReportManager = arReportManager;
        _emailInvoicesManager = emailInvoicesManager;
    }
    public async Task<object> DispatchInvoice(EmailArInvoiceDto dto)
    {
        return await  _emailInvoicesManager.DispatchInvoice(dto);
    }
    public async Task<object> DispatchQuotation(EmailQuotationDto dto)
    {
        return await  _emailInvoicesManager.DispatchQuotation(dto);
    }
    public async Task<object> DispatchPaymentReceipt(EmailPaymentReceiptDto dto)
    {
        return await  _emailInvoicesManager.DispatchPaymentReceipt(dto);
    }
}