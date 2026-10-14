using System;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using TopazERP.Services.Ledger.BankAccounts;
using TopazERP.Services.Ledger.BankAccounts.Dto;
using TopazERP.Services.Ledger.CoaControls;
using TopazERP.Services.Ledger.CoaControls.Dto;
using TopazERP.Services.Ledger.CoaDetails;
using TopazERP.Services.Ledger.CoaDetails.Dto;
using TopazERP.Services.Ledger.CoaHierachies;
using TopazERP.Services.Ledger.CoaHierachies.Dto;
using TopazERP.Services.Ledger.DefaultGlNumbers;
using TopazERP.Services.Ledger.DefaultGlNumbers.Dto;
using TopazERP.Services.Ledger.ImprestCategories;
using TopazERP.Services.Ledger.ImprestCategories.Dto;
using TopazERP.Services.Ledger.PettyCashRecipients;
using TopazERP.Services.Ledger.PettyCashRecipients.Dto;
using TopazERP.Services.Shared.Currencies;

namespace TopazERP.Web.Controllers
{
    [Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
    public class LedgerSetupsController : TopazERP.Controllers.TopazERPControllerBase
    {
        private readonly ICoaDetailAppService _coaDetailAppService;
        private readonly IImprestCategoryAppService _imprestCategoryAppService;
        private readonly IPettyCashRecipientAppService _pettyCashRecipientAppService;
        private readonly IBankAccountAppService _bankAccountAppService;
        private readonly ICoaHierachyAppService _coaHierachyAppService;
        private readonly ICoaControlAppService _coaControlAppService;
        private readonly ICurrencyAppService _currencyAppService;
        private readonly IDefaultGlNumberAppService _defaultGlNumberAppService;

        public LedgerSetupsController(ICoaDetailAppService coaDetailAppService, IImprestCategoryAppService imprestCategoryAppService, IPettyCashRecipientAppService pettyCashRecipientAppService, IBankAccountAppService bankAccountAppService, ICoaHierachyAppService coaHierachyAppService, ICoaControlAppService coaControlAppService, ICurrencyAppService currencyAppService, IDefaultGlNumberAppService defaultGlNumberAppService)
        {
            _coaDetailAppService = coaDetailAppService;
            _imprestCategoryAppService = imprestCategoryAppService;
            _pettyCashRecipientAppService = pettyCashRecipientAppService;
            _bankAccountAppService = bankAccountAppService;
            _coaHierachyAppService = coaHierachyAppService;
            _coaControlAppService = coaControlAppService;
            _currencyAppService = currencyAppService;
            _defaultGlNumberAppService = defaultGlNumberAppService;
        }

        public IActionResult BankAccounts()
        {
            return View();
        }
        
        public IActionResult CoaControl()
        {
            return View();
        }
        
        public IActionResult ChartOfAccounts()
        {
            return View();
        }
        
        public IActionResult CoaDetail()
        {
            return View();
        }
        
        public IActionResult ImprestCategories()
        {
            return View();
        }
        
        public IActionResult PettyCashRecipients()
        {
            return View();
        }
        
        public IActionResult DefaultLedgerNumbers()
        {
            return View();
        }

        //api
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetLedgerAccounts()
        {
            var accounts = await _coaDetailAppService.ListAll();
            return Json(accounts);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetLocalLedgerAccounts()
        {
            var accounts = await _coaDetailAppService.ListLocalAccounts();
            return Json(accounts);
        }
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetImprestCategories()
        {
            var results = await _imprestCategoryAppService.ListAll();
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateImprestCategory([FromBody] CreateImprestCategoryInput input)
        {
            var result = await _imprestCategoryAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateImprestCategory([FromBody] UpdateImprestCategoryInput input)
        {
            await _imprestCategoryAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelImprestCategory([FromQuery] Guid id)
        {
            await _imprestCategoryAppService.Delete(id);
            return Json(200);
        }
        
        //petty cash recipients
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetPettyCashRecipients()
        {
            var results = await _pettyCashRecipientAppService.ListAll();
            return Json(results);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreatePettyCashRecipient([FromBody] CreatePettyCashRecipientInput input)
        {
            var result = await _pettyCashRecipientAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdatePettyCashRecipient([FromBody] UpdatePettyCashRecipientInput input)
        {
            await _pettyCashRecipientAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelPettyCashRecipient([FromQuery] Guid id)
        {
            await _pettyCashRecipientAppService.Delete(id);
            return Json(200);
        }
        
        
        // bank accounts
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetBankAccounts()
        {
            var results = await _bankAccountAppService.ListAll();
            return Json(results);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateBankAccount([FromBody] CreateBankAccountInput input)
        {
            var result = await _bankAccountAppService.Create(input);
            return Json(result);

        }

        public async Task<ActionResult> UpdateBankAccount([FromBody] UpdateBankAccountInput input)
        {
            await _bankAccountAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelBankAccount([FromQuery] Guid id)
        {
            await _bankAccountAppService.Delete(id);
            return Json(200);
        }
        
        //
        
        //chart of accounts...
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetChartOfAccounts()
        {
            var result = await _coaHierachyAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateChartOfAccount([FromBody] CreateCoaHierachyInput input)
        {
            var result = await _coaHierachyAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateChartOfAccount([FromBody] UpdateCoaHierachyInput input)
        {
            await _coaHierachyAppService.Update(input);
            return Json(200);

        }

        public async Task<ActionResult> DelChartOfAccount([FromQuery] Guid id)
        {
            await _coaHierachyAppService.Delete(id);
            return Json(200);
        }


        //chart of accounts control...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetChartOfAccountContols()
        {
            var result = await _coaControlAppService.ListAll();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetChartOfAccountContolsByAccountGroup([FromQuery]Guid id)
        {
            var result = await _coaControlAppService.ListAll(id);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateChartOfAccountContol([FromBody] CreateCoaControlInput input)
        {
            var result = await _coaControlAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateChartOfAccountContol([FromBody] UpdateCoaControlInput input)
        {
            await _coaControlAppService.Update(input);
            return Json(200);
        }

        public async Task<ActionResult> DelChartOfAccountContol([FromQuery] Guid id)
        {
            await _coaControlAppService.Delete(id);
            return Json(200);
        }

        //
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetChartOfAccountDetails()
        {
            var accountDetails = await _coaDetailAppService.ListAll();
            var accountControls = await _coaControlAppService.ListAll();
            var currency = await _currencyAppService.ListAll();

            return Json(new { accountDetails, currency, accountControls });
        }
        
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetGlAccounts()
        {
            var accountDetails = await _coaDetailAppService.ListAll();

            return Json(accountDetails);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> CreateChartOfAccountDetail([FromBody] CreateCoaDetailInput input)
        {
            input.CurrentForeignBalance = 0;
            input.CurrentBalance = 0;

            var result = await _coaDetailAppService.Create(input);
            return Json(result);
        }

        public async Task<ActionResult> UpdateChartOfAccountDetail([FromBody] UpdateCoaDetailInput input)
        {
            input.CurrentForeignBalance = 0;
            input.CurrentBalance = 0;

            await _coaDetailAppService.Update(input);
            return Json(200);
        }

        public async Task<ActionResult> DelChartOfAccountDetail([FromQuery] Guid id)
        {
            await _coaDetailAppService.Delete(id);
            return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetDefaultGlSetup()
        {
            var result = await _defaultGlNumberAppService.GetDefaultSetup();
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> SaveDefaultGlNumbers([FromBody] CreateDefaultGlNumberInput input)
        {
            await _defaultGlNumberAppService.Create(input);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> UpdateDefaultGlNumbers([FromBody] UpdateDefaultGlNumberInput input)
        {
            await _defaultGlNumberAppService.Update(input);
            return Json(200);
        }
    }
}
