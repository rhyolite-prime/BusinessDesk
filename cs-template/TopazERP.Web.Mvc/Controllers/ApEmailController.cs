using System;
using System.Threading.Tasks;
using Abp.Web.Models;
using TopazERP.Controllers;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Actors.MessageModels;
using TopazERP.Services.Ap.EmailInvoices;

namespace TopazERP.Web.Controllers
{
    public class ApEmailController: TopazERPControllerBase
    {
        private readonly IEmailInvoicesAppService _emailInvoicesAppService;
        
        public ApEmailController(IEmailInvoicesAppService emailInvoicesAppService)
        {
            _emailInvoicesAppService = emailInvoicesAppService;
        }
        public IActionResult EmailApInvoice()
        {
            return View();
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> DispatchInvoice([FromBody] EmailApInvoiceDto dto)
        {
            var result = await _emailInvoicesAppService.DispatchInvoice(dto);
            return Ok(result);
        }
    }
}

