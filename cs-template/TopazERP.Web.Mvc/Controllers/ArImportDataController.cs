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
using Abp.Authorization;
using TopazERP.Authorization;
using TopazERP.DomainServices.Ar.ArOpeningBalances;
using TopazERP.Services.Shared.Customers;
using TopazERP.Services.Shared.Customers.Dto;
using TopazERP.Services.Ar.OpeningBalances.Dto;
using TopazERP.Models.Ar;
using TopazERP.DomainServices.Shared.Customers;
using TopazERP.Services.Ar.OpeningBalances;
using TopazERP.Services.Shared.Customers.Dto;
using TopazERP.Services.Shared.Customers;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.DomainServices.Shared.Statuses;
using TopazERP.DomainServices.Shared.CustomerGroups;
using TopazERP.Services.Ledger.CoaDetails;
using System.Linq;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;
using TopazERP.Services.Ar.OpeningBalances.Dto;


namespace TopazERP.Web.Controllers
{
    public class ArImportDataController: TopazERPControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly ICustomerAppService _customerAppService;
        private readonly IArOpeningBalanceAppService _openingBalanceAppSevice;
        private readonly ICustomerManager _customerManager;
        private readonly ICurrencyManager _currencyManager;
        private readonly IStatusManager _statusManager;
        private readonly ICustomerGroupManager _customerGroupManager;
        private readonly ICoaDetailAppService _coaDetailAppService;

        public ArImportDataController(ICustomerAppService customerAppService, IArOpeningBalanceAppService openingBalanceAppSevice, IWebHostEnvironment env, ICustomerManager customerManager, ICurrencyManager currencyManager, IStatusManager statusManager, ICustomerGroupManager customerGroupManager, ICoaDetailAppService coaDetailAppService)
        {
            _customerGroupManager = customerGroupManager;
            _coaDetailAppService = coaDetailAppService;
            _customerAppService = customerAppService;
            _openingBalanceAppSevice = openingBalanceAppSevice;
            _env = env;
            _customerManager = customerManager;
            _currencyManager = currencyManager;
            _statusManager = statusManager;
        }
        
        
        public IActionResult Customers()
        {
            return View();
        }
        public IActionResult OpeningBalance()
        {
            return View();
        }
        
        public async Task<IActionResult> DownloadCustomersUploadSample()
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "Customers.xlsx"));
            return File(fileBytes, "application/ms-excel", "Customers.xlsx");

        }
        
        public async Task<IActionResult> DownloadOpeningBalanceUploadSample() 
        {
            var wwwRoot = _env.WebRootPath;

            byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "ArOpeningBalance.xlsx"));
            return File(fileBytes, "application/ms-excel", "ArOpeningBalance.xlsx");

        }
        public class CustomerImportPreviewDto
        {
            public string Name { get; set; }
            public string AccountNumber { get; set; }
            public string Email { get; set; }
            public string PhoneNo { get; set; }
            public string Address { get; set; }

            public string CurrencyName { get; set; }
            public string CustomerGroupName { get; set; }

            public string CreditAccountName { get; set; }
            public string IrsAccountName { get; set; }
            public string VatAccountName { get; set; }

            public string VatNumber { get; set; }
            public string Status { get; set; }
            public string ContactPerson { get; set; }
            public string ContactPersonPhoneNo { get; set; }
            public string ContactPersonEmail { get; set; }
            public decimal Balance { get; set; }
            public decimal CreditLimit { get; set; }

            public List<string> Errors { get; set; } = new();
        }
        [HttpPost]
        public async Task<IActionResult> PreviewCustomerImport(IFormFile customFile)
        {
            try
            {
                ExcelEngine excelEngine = new ExcelEngine();
                IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
                IWorksheet worksheet = workbook.Worksheets[0];

                DataTable excelTable = worksheet.ExportDataTable(
                    worksheet.UsedRange,
                    ExcelExportDataTableOptions.ColumnNames);

                var previewList = new List<CustomerImportPreviewDto>();

                // Load dependencies ONCE (VERY IMPORTANT)
                var accounts = (await _coaDetailAppService.ListAll()) as List<CoaDetail>;
                var accountLookup = accounts?.ToDictionary(
                    x => $"{x.AccountNo} - {x.AccountName}",
                    x => x,
                    StringComparer.OrdinalIgnoreCase);

                var existingCustomers = (await _customerManager.ListAll()) as IEnumerable<Customer>
                                        ?? new List<Customer>();

                var existingCustomerNames = new HashSet<string>(
                    existingCustomers.Select(x => x.Name),
                    StringComparer.OrdinalIgnoreCase);
                var vatTracker = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (DataRow row in excelTable.Rows)
                {
                    var item = new CustomerImportPreviewDto
                    {
                        Name = row["Name"]?.ToString()?.Trim(),
                        AccountNumber = row["Account Number"]?.ToString()?.Trim(),
                        Email = row["Email"]?.ToString()?.Trim(),
                        PhoneNo = row["Phone No"]?.ToString()?.Trim(),
                        Address = row["Address"]?.ToString()?.Trim(),
                        CurrencyName = row["Currency"]?.ToString()?.Trim(),
                        CustomerGroupName = row["Customer Group"]?.ToString()?.Trim(),
                        CreditAccountName = row["Credit Gl"]?.ToString()?.Trim(),
                        IrsAccountName = row["IRS Gl"]?.ToString()?.Trim(),
                        VatAccountName = row["Vat Gl"]?.ToString()?.Trim(),
                        VatNumber = row["Vat No"]?.ToString()?.Trim(),
                        Status = row["Status"]?.ToString()?.Trim(),
                        ContactPerson = row["Contact Person"]?.ToString()?.Trim(),
                        ContactPersonPhoneNo = row["Contact Person Phone"]?.ToString()?.Trim(),
                        ContactPersonEmail = row["Contact Person Email"]?.ToString()?.Trim(),
                        Balance = row["Balance"]?.ToString()?.Trim() != "" ? Convert.ToDecimal(row["Balance"]) : 0,
                        CreditLimit = row["Credit Limit"]?.ToString()?.Trim() != "" ? Convert.ToDecimal(row["Credit Limit"]) : 0,
                    };

                    // =========================
                    // VALIDATIONS
                    // =========================

                    if (existingCustomerNames.Contains(item.Name))
                        item.Errors.Add("Customer already exists");

                    var currency = await _currencyManager.GetAsync(item.CurrencyName);
                    if (currency == null)
                        item.Errors.Add("Please Enter a valid currency name");

                    var group = await _customerGroupManager.GetAsync(item.CustomerGroupName);
                    if (group == null)
                        item.Errors.Add("Please Enter a valid customer group name");

                    if (!string.IsNullOrWhiteSpace(item.VatNumber))
                    {
                        // Check DB duplicates
                        var vatExists = existingCustomers.Any(x => x.VatNumber == item.VatNumber);
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
        public async Task<IActionResult> ImportCustomerList([FromBody] List<CustomerImportPreviewDto> rows)
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
                    var customers = new CreateCustomerInput
                    {
                        Name = item.Name,
                        AccountNumber = item.AccountNumber,
                        Email = item.Email,
                        PhoneNo = item.PhoneNo,
                        Address = item.Address,
                        CurrencyName = item.CurrencyName,
                        Balance = item.Balance,
                        CustomerGroupName = item.CustomerGroupName,
                        Status = item.Status,
                        VatNumber = item.VatNumber,
                        CreditAccountName = item.CreditAccountName,
                        IrsAccountName = item.IrsAccountName,
                        VatAccountName = item.VatAccountName,
                        ContactPerson = item.ContactPerson,
                        ContactPersonEmail = item.ContactPersonEmail,
                        ContactPersonPhone = item.ContactPersonPhoneNo,
                        CreditLimit = item.CreditLimit,
                        
                    };
                    var customerGroup = await _customerGroupManager.GetAsync(customers.CustomerGroupName);
                    var currency = await _currencyManager.GetAsync(customers.CurrencyName);
                    customers.StatusId = new Guid("a3b4c2f9-8e4d-4e79-b6b9-2d8c6b80b5fc");
                    customers.CustomerGroupId = customerGroup.Id;
                    customers.CurrencyId = currency.Id;
                    customers.CurrencyCode = currency.CurrencyCode;
                    customers.BuyingRate = currency.BuyRate;
                    customers.SellingRate = currency.SellRate;
                    customers.CreditAccountId = Guid.Empty;
                    customers.IrsAccountId = Guid.Empty;
                    customers.VatAccountId = Guid.Empty;

                    if (!string.IsNullOrWhiteSpace(customers.CreditAccountName) &&
                        accountLookup.TryGetValue(customers.CreditAccountName, out var creditGl))
                    {
                        customers.CreditAccountId = creditGl.Id;
                    }

                    if (!string.IsNullOrWhiteSpace(customers.IrsAccountName) &&
                        accountLookup.TryGetValue(customers.IrsAccountName, out var irsGl))
                    {
                        customers.IrsAccountId = irsGl.Id;
                    }

                    if (!string.IsNullOrWhiteSpace(customers.VatAccountName) &&
                        accountLookup.TryGetValue(customers.VatAccountName, out var vatGl))
                    {
                        customers.VatAccountId = vatGl.Id;
                    }

                    await _customerAppService.Create(customers);
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
            public string Customer { get; set; }
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
                var customers = (await _customerManager.ListAll()) as IEnumerable<Customer>
                                ?? new List<Customer>();

                var customerLookup = customers.ToDictionary(
                    x => x.Name,
                    StringComparer.OrdinalIgnoreCase);

                var existingBalances = await _openingBalanceAppSevice.ListAll(); // if available
                var balanceTracker = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (DataRow row in excelTable.Rows)
                {
                    var item = new OpeningBalanceImportPreviewDto
                    {
                        Customer = row["Customer"]?.ToString()?.Trim(),
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

                    // Customer check
                    if (string.IsNullOrWhiteSpace(item.Customer) ||
                        !customerLookup.ContainsKey(item.Customer))
                    {
                        item.Errors.Add("Customer does not exist");
                    }

                    // Currency check
                    var currency = await _currencyManager.GetAsync(item.CurrencyName);
                    if (currency == null)
                    {
                        item.Errors.Add("Invalid currency");
                    }

                    // OU check
                    var ouHierarchy = await _openingBalanceAppSevice
                        .GetOuIdByHierarchyAsync(item.OuName);

                    if (ouHierarchy == null)
                    {
                        item.Errors.Add("OU Name not found");
                    }

                    // Duplicate check (Customer + Currency)
                    var key = $"{item.Customer}-{item.CurrencyName}";
                    if (!balanceTracker.Add(key))
                    {
                        item.Errors.Add("Duplicate entry in file");
                    }

                    // Existing DB balance check
                    var customerEntity = customerLookup.ContainsKey(item.Customer)
                        ? customerLookup[item.Customer]
                        : null;

                    if (customerEntity != null && currency != null)
                    {
                        var existingBalance = await _openingBalanceAppSevice
                            .GetAsync(customerEntity.Name, currency.CurrencyName);

                        if (existingBalance != null)
                        {
                            item.Errors.Add("Customer already has opening balance in this currency");
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
                    var balances = new CreateArOpeningBalanceInput
                    {
                        CustomerName = item.Customer,
                        Amount = item.Amount,
                        BuyRate = item.CurrencyRate,
                        TransactionDate = item.TransactionDate,
                        CurrencyName = item.CurrencyName,
                        OuName = item.OuName,
                    };
                    var currency = await _currencyManager.GetAsync(balances.CurrencyName);
                    var customer = await _customerManager.GetAsync(balances.CustomerName);
                    var ou = await _openingBalanceAppSevice.GetOuIdByHierarchyAsync(balances.OuName);
                    balances.CurrencyId = currency.Id;
                    balances.CustomerId = customer.Id;
                    balances.SellRate = currency.SellRate;
                    balances.CurrencyCode = currency.CurrencyCode;
                    balances.AccountNumber = customer.AccountNumber;
                    balances.IsPosted = false;
                    if (ou != null) balances.OuId = ou.Value;
                    else balances.OuId = Guid.Empty;
                    await _openingBalanceAppSevice.Create(balances);
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


