using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Actors.MessageModels;
using TopazERP.Controllers;
using TopazERP.Services.Ar.EmailInvoices;
namespace TopazERP.Web.Controllers
{
    public class ArEmailController: TopazERPControllerBase
    {
        private readonly IEmailInvoicesAppService _emailInvoicesAppService;
        public ArEmailController(IEmailInvoicesAppService emailInvoicesAppService)
        {
            _emailInvoicesAppService = emailInvoicesAppService;
        }
        public IActionResult EmailInvoice()
        {
            return View();
        }
        public IActionResult EmailQuotation()
        {
            return View();
        }
        public IActionResult EmailPaymentReceipt()
        {
            return View();
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> DispatchInvoice([FromBody] EmailArInvoiceDto dto)
        {
            var result = await _emailInvoicesAppService.DispatchInvoice(dto);
            return Ok(result);
        }
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> DispatchQuotation([FromBody] EmailQuotationDto dto)
        {
            var result = await _emailInvoicesAppService.DispatchQuotation(dto);
            return Ok(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> DispatchPaymentReceipt([FromBody] EmailPaymentReceiptDto dto)
        {
            var result = await _emailInvoicesAppService.DispatchPaymentReceipt(dto);
            return Ok(result);
        }
    }
}
