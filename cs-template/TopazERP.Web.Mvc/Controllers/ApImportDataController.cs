using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using Syncfusion.XlsIO;
using System.Data;
using System.Threading.Tasks;
using System;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using System.Collections.Generic;
using System.Linq;
using Abp.Authorization;
using TopazERP.Authorization;
using TopazERP.DomainServices.Ap.OpeningBalances;
using TopazERP.Services.Shared.Suppliers;
using TopazERP.Services.Shared.Suppliers.Dto;
using TopazERP.Services.Ap.OpeningBalances.Dto;
using TopazERP.Services.Ap.OpeningBalances;
using TopazERP.Models.Ap;
using TopazERP.DomainServices.Shared.Suppliers;
//currency
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.DomainServices.Shared.SupplierGroups;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;
using TopazERP.Services.Ledger.CoaDetails;
using TopazERP.Services.Shared.Customers;
using TopazERP.Services.Shared.Customers.Dto;

namespace TopazERP.Web.Controllers
{
    [AbpAuthorize(PermissionNames.Ap_ImportData)]
    public class ApImportDataController : TopazERPControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ISupplierAppService _supplierAppService;
        private readonly IOpeningBalanceAppService _openingBalanceAppService;
        private readonly ISupplierManager _supplierManager;
        private readonly ICoaDetailAppService _coaDetailAppService;
        private readonly ICurrencyManager _currencyManager;
        private readonly ISupplierGroupManager _supplierGroupManager;
        
        public ApImportDataController(IWebHostEnvironment env, ISupplierAppService supplierAppService, IOpeningBalanceAppService openingBalanceAppService, ISupplierManager supplierManager, ICurrencyManager currencyManager, ICoaDetailAppService coaDetailAppService, ISupplierGroupManager supplierGroupManager)
        {
            _env = env;
            _supplierAppService = supplierAppService;
            _openingBalanceAppService = openingBalanceAppService;
            _supplierManager = supplierManager;
            _currencyManager = currencyManager;
            _coaDetailAppService = coaDetailAppService;
            _supplierGroupManager = supplierGroupManager;
        }
       
        
        [AbpAuthorize(PermissionNames.Ap_ImportData_SupplierList)]
        public IActionResult SupplierList()
        {
            return View();
        }
        public IActionResult ImportOpeningBalances()
        {
            return View();
        }
        
        public async Task<IActionResult> DownloadSuppliersUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "Suppliers.xlsx"));
            return File(fileBytes, "application/ms-excel", "Suppliers.xlsx");

        }
        public async Task<IActionResult> DownloadOpeningBalancesUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "ApOpeningBalance.xlsx"));
            return File(fileBytes, "application/ms-excel", "ApOpeningBalance.xlsx");

        }
        public class SupplierImportPreviewDto
        {
            public string Name { get; set; }
            public string AccountNumber { get; set; }
            public string Email { get; set; }
            public string PhoneNo { get; set; }
            public string Address { get; set; }

            public string CurrencyName { get; set; }
            public string SupplierGroupName { get; set; }

            public string CreditAccountName { get; set; }
            public string DebitAccountName { get; set; }
            public string IrsAccountName { get; set; }
            public string VatAccountName { get; set; }

            public string VatNumber { get; set; }
            public string Status { get; set; }
            public string ContactPerson { get; set; }
            public string ContactPersonPhoneNo { get; set; }
            public string ContactPersonEmail { get; set; }
            public decimal Balance { get; set; }
            public string TaxOffice { get; set; }
            public decimal CreditLimit { get; set; }
            
            public List<string> Errors { get; set; } = new();
        }
        [HttpPost]
        public async Task<IActionResult> PreviewSupplierImport(IFormFile customFile)
        {
            try
            {
                ExcelEngine excelEngine = new ExcelEngine();
                IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
                IWorksheet worksheet = workbook.Worksheets[0];

                DataTable excelTable = worksheet.ExportDataTable(
                    worksheet.UsedRange,
                    ExcelExportDataTableOptions.ColumnNames);

                var previewList = new List<SupplierImportPreviewDto>();

                // Load dependencies ONCE (VERY IMPORTANT)
                var accounts = (await _coaDetailAppService.ListAll()) as List<CoaDetail>;
                var accountLookup = accounts?.ToDictionary(
                    x => $"{x.AccountNo} - {x.AccountName}",
                    x => x,
                    StringComparer.OrdinalIgnoreCase);

                var existingSuppliers = (await _supplierManager.ListAll()) as IEnumerable<Supplier>
                                        ?? new List<Supplier>();

                var existingNames = new HashSet<string>(
                    existingSuppliers.Select(x => x.Name),
                    StringComparer.OrdinalIgnoreCase);
                var vatTracker = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (DataRow row in excelTable.Rows)
                {
                    var item = new SupplierImportPreviewDto
                    {
                        Name = row["Name"]?.ToString()?.Trim(),
                        AccountNumber = row["Account Number"]?.ToString()?.Trim(),
                        Email = row["Email"]?.ToString()?.Trim(),
                        PhoneNo = row["Phone No"]?.ToString()?.Trim(),
                        Address = row["Address"]?.ToString()?.Trim(),
                        CurrencyName = row["Currency"]?.ToString()?.Trim(),
                        SupplierGroupName = row["Supplier Group"]?.ToString()?.Trim(),
                        CreditAccountName = row["Credit Gl"]?.ToString()?.Trim(),
                        DebitAccountName = row["Debit Gl"]?.ToString()?.Trim(),
                        IrsAccountName = row["IRS Gl"]?.ToString()?.Trim(),
                        VatAccountName = row["Vat Gl"]?.ToString()?.Trim(),
                        VatNumber = row["Vat No"]?.ToString()?.Trim(),
                        Status = row["Status"]?.ToString()?.Trim(),
                        ContactPerson = row["Contact Person"]?.ToString()?.Trim(),
                        ContactPersonPhoneNo = row["Contact Person Phone"]?.ToString()?.Trim(),
                        ContactPersonEmail = row["Contact Person Email"]?.ToString()?.Trim(),
                        Balance = row["Balance"]?.ToString()?.Trim() != "" ? Convert.ToDecimal(row["Balance"]) : 0,
                        TaxOffice = row["Tax Office"]?.ToString()?.Trim(),
                        CreditLimit = row["Credit Limit"]?.ToString()?.Trim() != "" ? Convert.ToDecimal(row["Credit Limit"]) : 0,
                    };

                    // =========================
                    // VALIDATIONS
                    // =========================

                    if (existingNames.Contains(item.Name))
                        item.Errors.Add("Supplier already exists");

                    var currency = await _currencyManager.GetAsync(item.CurrencyName);
                    if (currency == null)
                        item.Errors.Add("Please Enter a valid currency name");

                    var group = await _supplierGroupManager.GetAsync(item.SupplierGroupName);
                    if (group == null)
                        item.Errors.Add("Please Enter a valid supplier group name");

                    if (!string.IsNullOrWhiteSpace(item.VatNumber))
                    {
                        // Check DB duplicates
                        var vatExists = existingSuppliers.Any(x => x.VatNumber == item.VatNumber);
                        if (vatExists)
                        {
                            item.Errors.Add("VAT number already exists in system");
                        }

                        // Check Excel duplicates
                        if (!vatTracker.Add(item.VatNumber))
                        {
                            item.Errors.Add("Duplicate VAT number in file");
                        }
                    }

                    if (accountLookup != null)
                    {
                        if (!string.IsNullOrWhiteSpace(item.CreditAccountName) &&
                            !accountLookup.ContainsKey(item.CreditAccountName))
                            item.Errors.Add("Invalid Credit GL");

                        if (!string.IsNullOrWhiteSpace(item.IrsAccountName) &&
                            !accountLookup.ContainsKey(item.IrsAccountName))
                            item.Errors.Add("Invalid IRS GL");

                        if (!string.IsNullOrWhiteSpace(item.VatAccountName) &&
                            !accountLookup.ContainsKey(item.VatAccountName))
                            item.Errors.Add("Invalid VAT GL");
                        
                        if (!string.IsNullOrWhiteSpace(item.DebitAccountName) &&
                            !accountLookup.ContainsKey(item.DebitAccountName))
                            item.Errors.Add("Invalid Debit GL");
                    }

                    previewList.Add(item);
                }

                return Json(new { result = previewList });
            }
            catch (Exception ex)
            {
                Logger.Error(ex.Message, ex);
                return BadRequest(ex.Message);
            }
        }
        [HttpPost]
        public async Task<IActionResult> ImportSupplierList([FromBody] List<SupplierImportPreviewDto> rows)
        {
            try
            {
                var accounts = (await _coaDetailAppService.ListAll()) as List<CoaDetail>;

                var accountLookup = accounts.ToDictionary(
                    x => $"{x.AccountNo} - {x.AccountName}",
                    x => x,
                    StringComparer.OrdinalIgnoreCase);

                foreach (var item in rows)
                {
                    var suppliers = new CreateSupplierInput
                    {
                        Name = item.Name,
                        AccountNumber = item.AccountNumber,
                        Email = item.Email,
                        PhoneNo = item.PhoneNo,
                        Address = item.Address,
                        CurrencyName = item.CurrencyName,
                        SupplierGroupName = item.SupplierGroupName,
                        StatusName = item.Status,
                        VatNumber = item.VatNumber,
                        CreditAccountName = item.CreditAccountName,
                        IrsAccountName = item.IrsAccountName,
                        VatAccountName = item.VatAccountName,
                        Balance = item.Balance,
                        taxOffice = item.TaxOffice,
                        CreditLimit = item.CreditLimit,
                        ContactPerson = item.ContactPerson,
                        ContactPersonPhone = item.ContactPersonPhoneNo,
                        ContactPersonEmail = item.ContactPersonEmail,
                    };
                    var supplierGroup = await _supplierGroupManager.GetAsync(suppliers.SupplierGroupName);
                    var currency = await _currencyManager.GetAsync(suppliers.CurrencyName);
                    suppliers.SupplierGroupId = supplierGroup.Id;
                    suppliers.CurrencyId = currency.Id;
                    suppliers.CurrencyCode = currency.CurrencyCode;
                    suppliers.buyingRate = currency.BuyRate;
                    suppliers.sellingRate = currency.SellRate;
                    suppliers.CreditAccountId = Guid.Empty;
                    suppliers.IrsAccountId = Guid.Empty;
                    suppliers.VatAccountId = Guid.Empty;
                    suppliers.DebitAccountId = Guid.Empty;

                    if (!string.IsNullOrWhiteSpace(suppliers.CreditAccountName) &&
                        accountLookup.TryGetValue(suppliers.CreditAccountName, out var creditGl))
                    {
                        suppliers.CreditAccountId = creditGl.Id;
                    }

                    if (!string.IsNullOrWhiteSpace(suppliers.IrsAccountName) &&
                        accountLookup.TryGetValue(suppliers.IrsAccountName, out var irsGl))
                    {
                        suppliers.IrsAccountId = irsGl.Id;
                    }

                    if (!string.IsNullOrWhiteSpace(suppliers.VatAccountName) &&
                        accountLookup.TryGetValue(suppliers.VatAccountName, out var vatGl))
                    {
                        suppliers.VatAccountId = vatGl.Id;
                    }
                    
                    if (!string.IsNullOrWhiteSpace(suppliers.DebitAccountName) &&
                        accountLookup.TryGetValue(suppliers.DebitAccountName, out var debitGl))
                    {
                        suppliers.DebitAccountId = debitGl.Id;
                    }

                    await _supplierAppService.Create(suppliers);
                }

                return Json(new
                {
                    result = new { code = 200, message = "Import completed successfully" }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    result = new { code = 500, message = ex.Message }
                });
            }
        }

        public class OpeningBalanceImportPreviewDto
        {
            public string Supplier { get; set; }
            public string CurrencyName { get; set; }
            public decimal Amount { get; set; }
            public decimal CurrencyRate { get; set; }
            public DateTime TransactionDate { get; set; }
            public string OuName { get; set; }
            public List<string> Errors { get; set; } = new();
        }
        [HttpPost]
        public async Task<IActionResult> PreviewOpeningBalanceImport(IFormFile customFile)
        {
            try
            {
                ExcelEngine excelEngine = new ExcelEngine();
                IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
                IWorksheet worksheet = workbook.Worksheets[0];

                DataTable excelTable = worksheet.ExportDataTable(
                    worksheet.UsedRange,
                    ExcelExportDataTableOptions.ColumnNames);

                var previewList = new List<OpeningBalanceImportPreviewDto>();

                // =========================
                // LOAD LOOKUPS ONCE
                // =========================
                var suppliers = (await _supplierManager.ListAll()) as IEnumerable<Supplier>
                                ?? new List<Supplier>();

                var supplierLookup = suppliers.ToDictionary(
                    x => x.Name,
                    StringComparer.OrdinalIgnoreCase);

                var existingBalances = await _openingBalanceAppService.ListAll(); // if available
                var balanceTracker = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (DataRow row in excelTable.Rows)
                {
                    var item = new OpeningBalanceImportPreviewDto
                    {
                        Supplier = row["Supplier"]?.ToString()?.Trim(),
                        CurrencyName = row["Currency"]?.ToString()?.Trim(),
                        OuName = row["Ou Name"]?.ToString()?.Trim(),

                        CurrencyRate = decimal.TryParse(row["Currency Rate"]?.ToString(), out var rate)
                            ? rate : 1,

                        Amount = decimal.TryParse(row["Amount"]?.ToString(), out var amt)
                            ? amt : 0,

                        TransactionDate = DateTime.TryParse(row["Transaction Date"]?.ToString(), out var dt)
                            ? dt : DateTime.UtcNow
                    };

                    // =========================
                    // VALIDATIONS
                    // =========================

                    // Supplier check
                    if (string.IsNullOrWhiteSpace(item.Supplier) ||
                        !supplierLookup.ContainsKey(item.Supplier))
                    {
                        item.Errors.Add("Supplier does not exist");
                    }

                    // Currency check
                    var currency = await _currencyManager.GetAsync(item.CurrencyName);
                    if (currency == null)
                    {
                        item.Errors.Add("Invalid currency");
                    }

                    // OU check
                    var ouHierarchy = await _openingBalanceAppService
                        .GetOuIdByHierarchyAsync(item.OuName);

                    if (ouHierarchy == null)
                    {
                        item.Errors.Add("OU Name not found");
                    }

                    // Duplicate check (Supplier + Currency)
                    var key = $"{item.Supplier}-{item.CurrencyName}";
                    if (!balanceTracker.Add(key))
                    {
                        item.Errors.Add("Duplicate entry in file");
                    }

                    // Existing DB balance check
                    var supplierEntity = supplierLookup.ContainsKey(item.Supplier)
                        ? supplierLookup[item.Supplier]
                        : null;

                    if (supplierEntity != null && currency != null)
                    {
                        var existingBalance = await _openingBalanceAppService
                            .GetAsync(supplierEntity.Name, currency.CurrencyName);

                        if (existingBalance != null)
                        {
                            item.Errors.Add("Supplier already has opening balance in this currency");
                        }
                    }

                    previewList.Add(item);
                }

                return Json(new { result = previewList });
            }
            catch (Exception ex)
            {
                Logger.Error(ex.ToString());
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
        [HttpPost]
        public async Task<IActionResult> ImportOpeningBalances([FromBody] List<OpeningBalanceImportPreviewDto> rows)
        {
            try
            {
                foreach (var item in rows)
                {
                    var balances = new CreateOpeningBalanceInput
                    {
                        SupplierName = item.Supplier,
                        Amount = item.Amount,
                        BuyRate = item.CurrencyRate,
                        TransactionDate = item.TransactionDate,
                        CurrencyName = item.CurrencyName,
                        OuName = item.OuName,
                    };
                    var currency = await _currencyManager.GetAsync(balances.CurrencyName);
                    var supplier = await _supplierManager.GetAsync(balances.SupplierName);
                    var ou = await _openingBalanceAppService.GetOuIdByHierarchyAsync(balances.OuName);
                    balances.CurrencyId = currency.Id;
                    balances.SupplierId = supplier.Id;
                    balances.SellRate = currency.SellRate;
                    balances.CurrencyCode = currency.CurrencyCode;
                    balances.AccountNumber = supplier.AccountNumber;
                    balances.IsPosted = false;
                    if (ou != null) balances.OuId = ou.Value;
                    else balances.OuId = Guid.Empty;
                    await _openingBalanceAppService.Create(balances);
                }
                return Json(new
                {
                    result = new { code = 200, message = "Import completed successfully" }
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    result = new { code = 500, message = ex.Message }
                });
            }
        }
    }
}