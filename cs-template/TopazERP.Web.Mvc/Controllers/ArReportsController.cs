using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using System.Collections.Generic;
using System.Dynamic;
using System.IO;
using System.Text;
using Abp.Authorization;
using Microsoft.AspNetCore.Hosting;
using Syncfusion.HtmlConverter;
using Syncfusion.Pdf;
using TopazERP.Actors.MessageModels;
using TopazERP.Authorization;
using TopazERP.Controllers;
using TopazERP.DomainServices.Ar.Reports.Dto;
using TopazERP.Services.Ar.Reports;

namespace TopazERP.Web.Controllers;
[AbpAuthorize(PermissionNames.Ar_Reports)]
public class ArReportsController: TopazERPControllerBase
{
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly IArReportAppService _arReportsAppService;
    public ArReportsController(IWebHostEnvironment webHostEnvironment, IArReportAppService arReportsAppService)
    {
        _arReportsAppService = arReportsAppService;
        _webHostEnvironment = webHostEnvironment;
    }
    
    
    public IActionResult Customers()
    {
        return View();
    }
    
    public IActionResult AgeingReport()
    {
        return View();
    }
    
    public IActionResult CreditMemo()
    {
        return View();
    }
    
    public IActionResult Statement()
    {
        return View();
    }
    public IActionResult StatementsByOu()
    {
        return View();
    }
    public IActionResult Invoice()
    {
        return View();
    }
    
    public IActionResult Payments()
    {
        return View();
    }
    
    public IActionResult InvoiceDetails()
    {
        return View();
    }
    
    public IActionResult GrOpeningBalances()
    {
        return View();
    }
    public IActionResult Quotations()
    {
        return View();
    }
    
    public IActionResult CanceledInvoices()
    {
        return View();
    }
    public IActionResult AuditLogs()
    {
        return View();
    }
    public IActionResult PrintPaymentReceipt(Guid id)
    {
        dynamic viewModel = new ExpandoObject();
        viewModel.Id = id;
        return View(viewModel);
    }
    public IActionResult PrintOpeningBalance(Guid customerId)
    {
        dynamic viewModel = new ExpandoObject();
        viewModel.CustomerId = customerId;
        return View(viewModel);
    }
    public IActionResult GlTransactions()
    {
        return View();
    }
    //apis
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GrGetCustomers()
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("Customer LIST");
        var reportDetails = await _arReportsAppService.GetCustomers();

        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceDetails([FromQuery]Guid id)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR INVOICE");
        var reportDetails = await _arReportsAppService.GetInvoiceReport(id);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetCanceledInvoices()
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR CANCELED INVOICES");
        var reportDetails = await _arReportsAppService.GetCanceledInvoices();
        return Json(new { reportHeader, reportDetails });
    }
    
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetCustomersByGroup(Guid customerGroupId, string customerGroupName)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader($"CUSTOMER LIST FOR {customerGroupName}");
        var reportDetails = await _arReportsAppService.GetCustomersByGroup(customerGroupId);

        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult>GetStatement(Guid customerId)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("Statement");
        var reportDetails = await _arReportsAppService.GetStatement(customerId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async  Task<ActionResult> GetStatementType2(Guid customerId, DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("For the Period " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _arReportsAppService.GetStatementType2(customerId, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async  Task<ActionResult> GetStatementType3(Guid customerId, DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("For the Period " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _arReportsAppService.GetStatementType3(customerId, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
     [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoice(Guid customerId)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("CUSTOMER INVOICES");
        var reportDetails = await _arReportsAppService.GetInvoice(customerId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAllInvoices()
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("INVOICES");
        var reportDetails = await _arReportsAppService.GetAllInvoices();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByBatch(string batchNumber)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR INVOICE BY BATCH NUMBER: " + batchNumber);
        var reportDetails = await _arReportsAppService.GetInvoiceByBatch(batchNumber);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByInvoiceNumber(string invoiceNumber)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR INVOICE BY INVOICE NUMBER: " + invoiceNumber);
        var reportDetails = await _arReportsAppService.GetInvoiceByInvoiceNumber(invoiceNumber);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByDate(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR INVOICES FROM " + startDate.ToString("dd/MM/yyyy") + " TO " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _arReportsAppService.GetInvoiceByDate(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByInvoiceNumberRange(int startNumber, int endNumber)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR INVOICES FROM " + startNumber + " TO " + endNumber);
        var reportDetails = await _arReportsAppService.GetInvoiceByRange(startNumber, endNumber);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceReport(Guid id)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("INVOICE");
        var reportDetails = await _arReportsAppService.GetInvoiceReport(id);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetOpeningBalances(string status)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader($"AR OPENING BALANCES- {status.ToUpper()}");
        var reportDetails = await _arReportsAppService.GetOpeningBalances(status);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetOpeningBalancesByCustomer(Guid customerId, string status)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader($"AR OPENING BALANCES- {status.ToUpper()}");
        var reportDetails = await _arReportsAppService.GetOpeningBalancesByCustomer(customerId, status);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAllConvertedOpeningBalances(string status)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader($"AR Opening Balances Converted To Ghana Cedis- {status.ToUpper()}");
        var reportDetails = await _arReportsAppService.GetAllConvertedOpeningBalances(status);
        return Json(new { reportHeader, reportDetails });
    }
    
     [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPayments()
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR PAYMENT HISTORY");
        var reportDetails = await _arReportsAppService.GetPayments();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentsByCustomers(Guid customerId)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR PAYMENT HISTORY");
        var reportDetails = await _arReportsAppService.GetPaymentsByCustomer(customerId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentsByDate(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR PAYMENT HISTORY FROM " + startDate.ToString("dd/MM/yyyy") + " TO " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _arReportsAppService.GetPaymentsByDate(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentReceipts(Guid id)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR PAYMENT RECEIPTS");
        var reportDetails = await _arReportsAppService.GetPaymentReceipts(id);
        return Json(new { reportHeader, reportDetails });
    }
    public async Task<ActionResult> GetPaymentReceiptsBulk([FromBody] List<Guid> ids)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR PAYMENT RECEIPTS");
        var reportDetails = await _arReportsAppService.GetPaymentReceipts(ids);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetQuotations()
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("QUOTATIONS");
        var reportDetails = await _arReportsAppService.GetQuotations();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetQuotationByCustomer(Guid customerId)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("QUOTATIONS");
        var reportDetails = await _arReportsAppService.GetQuotationByCustomer(customerId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetQuotationByDate(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("QUOTATIONS");
        var reportDetails = await _arReportsAppService.GetQuotationByDate(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetQuotation(Guid quotationId)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("QUOTATION");
        var reportDetails = await _arReportsAppService.GetQuotation(quotationId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetCreditMemo()
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("CREDIT MEMO");
        var reportDetails = await _arReportsAppService.GetCreditMemo();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAgingSummary(DateTime startDate, int agingInterval)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR AGING SUMMARY");
        var reportDetails = await _arReportsAppService.GetAgingSummary(startDate, agingInterval);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAgeingByCustomer(Guid customerId, DateTime startDate, int agingInterval)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR AGING BY CUSTOMER");
        var reportDetails = await _arReportsAppService.GetAgeingByCustomer(customerId, startDate, agingInterval);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAgeingByDate(DateTime startDate, int agingInterval)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("AR AGING BY DATE");
        var reportDetails = await _arReportsAppService.GetAgeingByDate(startDate, agingInterval);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoicePdf(Guid id)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader("INVOICE");
        var reportDetails = await _arReportsAppService.GetInvoiceDetails(id);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetGlTransactions(DateTime startDate, DateTime endDate, bool isMultiCurrency)
    {
        var reportHeader = await _arReportsAppService.GetReportHeader($"AR GL Transaction For Period {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _arReportsAppService.GetGlTransaction(startDate, endDate, isMultiCurrency);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<IActionResult> GetInvoiceInPdf(Guid id)
{
    // 1️⃣ Fetch invoice data
    dynamic invoiceData = await _arReportsAppService.GetInvoiceDetails(id);
    if (invoiceData is IDictionary<string, object> errorMessage && errorMessage.ContainsKey("message"))
    {
        return BadRequest(errorMessage["message"]);
    }
    // Use ReportHeader from invoiceData instead of fetching it separately
    var reportHeader = invoiceData.ReportHeader;
    var customerInfo = invoiceData.CustomerInfo;
    var invoiceDetails = invoiceData.InvoiceDetails;
   
    var referenceNumber = invoiceData.ReferenceNumber;
    // Load HTML template
    var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "arinvoice.html");
    if (!System.IO.File.Exists(filePath)) return NotFound("Template not found.");
    var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

    // 3️⃣ Replace placeholders in HTML with invoice data
    var finalHtml = htmlTemplate
        .Replace("{{CompanyName}}", reportHeader.CompanyName)
        .Replace("{{Address}}", reportHeader.Address)
        .Replace("{{PrimaryPhoneNo}}", reportHeader.PrimaryPhoneNo)
        .Replace("{{Email}}", reportHeader.Email)
        .Replace("{{CompanyLogo}}", reportHeader.CompanyLogo)
        .Replace("{{InvoiceNumber}}", invoiceData.InvoiceNumber)
        .Replace("{{InvoiceDate}}", invoiceData.InvoiceDate)
        .Replace("{{ProjectedPayDate}}", invoiceData.ProjectedPayDate)
        .Replace("{{Balance}}", invoiceData.Balance.ToString("N2"))
        .Replace("{{TotalInvoiceAmount}}", invoiceData.TotalInvoiceAmount.ToString("N2"))
        .Replace("{{AmountInWords}}", invoiceData.AmountInWords)
        .Replace("{{CurrencyName}}", invoiceData.CurrencyName)
        .Replace("{{CustomerName}}", customerInfo.CustomerName)
        .Replace("{{CustomerAddress}}", customerInfo.CustomerAddress)
        .Replace("{{CustomerPhoneNo}}", customerInfo.CustomerPhoneNo)
        .Replace("{{AccountNumber}}", customerInfo.AccountNumber)
        /*.Replace("{{ContactPerson}}", customerInfo.ContactPerson)*/
        .Replace("{{VatNumber}}", customerInfo.VatNumber)
        .Replace("{{CreditLimit}}", customerInfo.CreditLimit.ToString("N2"))
        .Replace("{{PurchaseOrderNumber}}", invoiceData.PurchaseOrderNumber)
        .Replace("{{VatAmount}}", invoiceData.VatAmount.ToString("N2"))
        .Replace("{{ReportTitle}}", reportHeader.ReportTitle)
        .Replace("{{ReferenceNumber}}", referenceNumber)
        .Replace("{{TotalDiscount}}", invoiceData.TotalDiscount.ToString("N2"))
        .Replace("{{TotalBeforeDiscount}}", invoiceData.TotalBeforeDiscount.ToString("N2"))
        .Replace("{{CurrentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"));
    // calculate pageNumber
    var pageNumber = 1;
    var pageBreak = "<div style='page-break-after: always;'></div>";
    var pageBreakCount = finalHtml.Split(pageBreak).Length;
    finalHtml = finalHtml.Replace("{{PageNumber}}", pageNumber.ToString());
    finalHtml = finalHtml.Replace("{{PageBreakCount}}", pageBreakCount.ToString());
    // 4️⃣ Generate invoice details rows
    
    
    var generatedRows = new StringBuilder();

    foreach (var row in invoiceDetails)
    {
        generatedRows.Append("<tr>");
        generatedRows.Append($"<td>{row.Index}</td>");
        generatedRows.Append($"<td class='description'>{row.Description}</td>");
        generatedRows.Append($"<td class='quantity'>{row.Quantity}</td>");
        generatedRows.Append($"<td class='amount'>{(row.UnitPrice != null ? row.UnitPrice.ToString("N2") : "0.00")}</td>");
        generatedRows.Append($"<td class='amount'>{(row.AmountBeforeDiscount != null ? row.AmountBeforeDiscount.ToString("N2") : "0.00")}</td>");
        generatedRows.Append($"<td class='amount'>{(row.Amount != null ? row.Amount : "0.00")}</td>");
        generatedRows.Append($"<td class='amount'>{(row.SubTotal != null ? row.SubTotal.ToString("N2") : "0.00")}</td>");
        generatedRows.Append("</tr>");
    }
    
       
      
        finalHtml = finalHtml.Replace("{{InvoiceDetails}}", generatedRows.ToString())
        .Replace("{{TaxLevies}}", "");
    
    // 5️⃣ Convert HTML to PDF
    var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");
    var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);
    var blinkConverterSettings = new BlinkConverterSettings
    {
        BlinkPath = blinkEnginePath,
        Orientation = PdfPageOrientation.Portrait,
        EnableJavaScript = true,
        AdditionalDelay = 2000
    };
    htmlConverter.ConverterSettings = blinkConverterSettings;

    using (var document1 = htmlConverter.Convert(finalHtml, string.Empty))
    using (var stream1 = new MemoryStream())
    {
        document1.Save(stream1);
        document1.Close(true);

        using (var finalDoc = new PdfDocument())
        {
            finalDoc.PageSettings.Size = PdfPageSize.A4;
            Stream[] streams = { stream1 };
            PdfDocumentBase.Merge(finalDoc, streams);

            using (var reportStream = new MemoryStream())
            {
                finalDoc.Save(reportStream);
                finalDoc.Close(true);

                return File(reportStream.ToArray(), "application/pdf", "Invoice.pdf");
            }
        }
    }
}

  [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<IActionResult> GetQuotationInPdf(Guid id)
{
    dynamic quotationData = await _arReportsAppService.GetQuotationPdf(id);
    if (quotationData is IDictionary<string, object> errorMessage && errorMessage.ContainsKey("message"))
    {
        return BadRequest(errorMessage["message"]);
    }
   
    var reportHeader = quotationData.ReportHeader;
    var customerInfo = quotationData.CustomerInfo;
    var details = quotationData.Details;
   
    var referenceNumber = quotationData.ReferenceNumber;
    // Load HTML template
    var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "quotation.html");
    if (!System.IO.File.Exists(filePath)) return NotFound("Template not found.");
    var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

    // 3️⃣ Replace placeholders in HTML with invoice data
    var finalHtml = htmlTemplate
        .Replace("{{CompanyName}}", reportHeader.CompanyName)
        .Replace("{{Address}}", reportHeader.Address)
        .Replace("{{PrimaryPhoneNo}}", reportHeader.PrimaryPhoneNo)
        .Replace("{{Email}}", reportHeader.Email)
        .Replace("{{CompanyLogo}}", reportHeader.CompanyLogo)
        .Replace("{{QuotationNumber}}",quotationData.QuotationNumber)
        .Replace("{{QuotationDate}}", quotationData.QuotationDate)
        .Replace("{{Notes}}", quotationData.Notes)
        .Replace("{{TotalAmount}}", quotationData.TotalAmount.ToString("N2"))
        .Replace("{{AmountInWords}}", quotationData.AmountInWords)
        .Replace("{{CurrencyName}}", quotationData.CurrencyName)
        .Replace("{{CustomerName}}", customerInfo.CustomerName)
        .Replace("{{CustomerAddress}}", customerInfo.CustomerAddress)
        .Replace("{{CustomerPhoneNo}}", customerInfo.CustomerPhoneNo)
        .Replace("{{AccountNumber}}", customerInfo.AccountNumber)
        .Replace("{{VatNumber}}", customerInfo.VatNumber)
        .Replace("{{ReportTitle}}", reportHeader.ReportTitle)
        .Replace("{{ReferenceNumber}}", referenceNumber)
        .Replace("{{TotalDiscount}}", quotationData.TotalDiscount.ToString("N2"))
        .Replace("{{TotalBeforeDiscount}}", quotationData.TotalBeforeDiscount.ToString("N2"))
        .Replace("{{CurrentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"));
    // calculate pageNumber
    var pageNumber = 1;
    var pageBreak = "<div style='page-break-after: always;'></div>";
    var pageBreakCount = finalHtml.Split(pageBreak).Length;
    finalHtml = finalHtml.Replace("{{PageNumber}}", pageNumber.ToString());
    finalHtml = finalHtml.Replace("{{PageBreakCount}}", pageBreakCount.ToString());
    // 4️⃣ Generate invoice details rows
    
    
    var generatedRows = new StringBuilder();

    foreach (var row in details)
    {
        generatedRows.Append("<tr>");
        generatedRows.Append($"<td>{row.Index}</td>");
        generatedRows.Append($"<td class='description'>{row.Description}</td>");
        generatedRows.Append($"<td class='quantity'>{row.Quantity}</td>");
        generatedRows.Append($"<td class='amount'>{(row.UnitPrice != null ? row.UnitPrice.ToString("N2") : "0.00")}</td>");
        generatedRows.Append($"<td class='amount'>{(row.AmountBeforeDiscount != null ? row.AmountBeforeDiscount.ToString("N2") : "0.00")}</td>");
        generatedRows.Append($"<td class='amount'>{(row.Amount != null ? row.Amount : "0.00")}</td>");
        generatedRows.Append($"<td class='amount'>{(row.SubTotal != null ? row.SubTotal.ToString("N2") : "0.00")}</td>");
        generatedRows.Append("</tr>");
    }
    
       
      
        finalHtml = finalHtml.Replace("{{Details}}", generatedRows.ToString())
        .Replace("{{TaxLevies}}", "");
    
    // 5️⃣ Convert HTML to PDF
    var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");
    var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);
    var blinkConverterSettings = new BlinkConverterSettings
    {
        BlinkPath = blinkEnginePath,
        Orientation = PdfPageOrientation.Portrait,
        EnableJavaScript = true,
        AdditionalDelay = 2000
    };
    htmlConverter.ConverterSettings = blinkConverterSettings;

    using (var document1 = htmlConverter.Convert(finalHtml, string.Empty))
    using (var stream1 = new MemoryStream())
    {
        document1.Save(stream1);
        document1.Close(true);

        using (var finalDoc = new PdfDocument())
        {
            finalDoc.PageSettings.Size = PdfPageSize.A4;
            Stream[] streams = { stream1 };
            PdfDocumentBase.Merge(finalDoc, streams);

            using (var reportStream = new MemoryStream())
            {
                finalDoc.Save(reportStream);
                finalDoc.Close(true);

                return File(reportStream.ToArray(), "application/pdf", "Quotation.pdf");
            }
        }
    }
}



/*
[WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<IActionResult> GetReceiptInPdf(Guid id)
{
    dynamic paymentData = await _arReportsAppService.GetPaymentReceipts(id);
    if (paymentData is IDictionary<string, object> errorMessage && errorMessage.ContainsKey("message"))
    {
        return BadRequest(errorMessage["message"]);
    }
    var receipts = (List<PaymentReceipts>)paymentData;
    var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "ar-payment-receipt.html");
    if (!System.IO.File.Exists(filePath)) return NotFound("Template not found.");
    var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);
    
    // 3️⃣ Replace placeholders in HTML with invoice data
    var finalHtml = htmlTemplate
        .Replace("{{PaidAmount}}", paymentData.PaidAmount.ToString("N2"))
        .Replace("{{PaymentDate}}", paymentData.PaymentDate)
        .Replace("{{ModeOfPayment}}", paymentData.ModeOfPayment)
        .Replace("{{ReceiptNumber}}", paymentData.ReceiptNo)
        .Replace("{{AmountInWords}}",paymentData.AmountInWords)
        .Replace("{{CurrencyName}}",paymentData.CurrencyName)
        .Replace("{{CurrencyCode}}",paymentData.CurrencyCode)
        .Replace("{{CustomerName}}",paymentData.CustomerName)
        .Replace("{{BankName}}", paymentData.BankName)
        .Replace("{{BankBranch}}",paymentData.BankBranch)
        .Replace("{{ChequeNo}}", paymentData.ChequeNo)
        .Replace("{{InvoiceNo}}", paymentData.InvoiceNo)
        .Replace("{{CurrentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"));
    // calculate pageNumber
    var pageNumber = 1;
    var pageBreak = "<div style='page-break-after: always;'></div>";
    var pageBreakCount = finalHtml.Split(pageBreak).Length;
    finalHtml = finalHtml.Replace("{{PageNumber}}", pageNumber.ToString());
    finalHtml = finalHtml.Replace("{{PageBreakCount}}", pageBreakCount.ToString());
    
    
    var generatedRows = new StringBuilder();

    // 5️⃣ Convert HTML to PDF
    var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");
    var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);
    var blinkConverterSettings = new BlinkConverterSettings
    {
        BlinkPath = blinkEnginePath,
        Orientation = PdfPageOrientation.Portrait,
        EnableJavaScript = true,
        AdditionalDelay = 2000
    };
    htmlConverter.ConverterSettings = blinkConverterSettings;

    using (var document1 = htmlConverter.Convert(finalHtml, string.Empty))
    using (var stream1 = new MemoryStream())
    {
        document1.Save(stream1);
        document1.Close(true);

        using (var finalDoc = new PdfDocument())
        {
            finalDoc.PageSettings.Size = PdfPageSize.A4;
            Stream[] streams = { stream1 };
            PdfDocumentBase.Merge(finalDoc, streams);

            using (var reportStream = new MemoryStream())
            {
                finalDoc.Save(reportStream);
                finalDoc.Close(true);

                return File(reportStream.ToArray(), "application/pdf", "Receipt.pdf");
            }
        }
    }
}*/
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<IActionResult> GetReceiptInPdf(Guid id)
{
    dynamic paymentData = await _arReportsAppService.GetPaymentReceipts(id);

    // Handle error case
    if (paymentData is IDictionary<string, object> errorMessage && errorMessage.ContainsKey("message"))
    {
        return BadRequest(errorMessage["message"]);
    }

    // Cast result to a list of receipts
    var receipts = (List<PaymentReceipts>)paymentData;

    var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "ar-payment-receipt.html");
    if (!System.IO.File.Exists(filePath))
        return NotFound("Template not found.");

    var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

    var finalHtmlBuilder = new StringBuilder();
    int pageNumber = 1;

    foreach (var receipt in receipts)
    {
        var html = htmlTemplate
            .Replace("{{PaidAmount}}", receipt.PaidAmount.ToString("N2"))
            .Replace("{{PaymentDate}}", receipt.PaymentDate)
            .Replace("{{ModeOfPayment}}", receipt.ModeOfPayment)
            .Replace("{{ReceiptNumber}}", receipt.ReceiptNo)
            .Replace("{{AmountInWords}}", receipt.AmountInWords)
            .Replace("{{CurrencyName}}", receipt.CurrencyName)
            .Replace("{{CurrencyCode}}", receipt.CurrencyCode)
            .Replace("{{CustomerName}}", receipt.CustomerName)
            .Replace("{{BankName}}", receipt.BankName)
            .Replace("{{BankBranch}}", receipt.BankBranch)
            .Replace("{{ChequeNo}}", receipt.ChequeNo)
            .Replace("{{InvoiceNo}}", receipt.InvoiceNo)
            .Replace("{{CurrentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"))
            .Replace("{{PageNumber}}", pageNumber.ToString());

        finalHtmlBuilder.Append(html);

        // Add page break if not the last page
        if (pageNumber < receipts.Count)
        {
            finalHtmlBuilder.Append("<div style='page-break-after: always;'></div>");
        }

        pageNumber++;
    }

    var finalHtml = finalHtmlBuilder.ToString();

    // Update total page count
    finalHtml = finalHtml.Replace("{{PageBreakCount}}", receipts.Count.ToString());

    // 5️⃣ Convert HTML to PDF
    var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");
    var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);
    var blinkConverterSettings = new BlinkConverterSettings
    {
        BlinkPath = blinkEnginePath,
        Orientation = PdfPageOrientation.Portrait,
        EnableJavaScript = true,
        AdditionalDelay = 2000
    };
    htmlConverter.ConverterSettings = blinkConverterSettings;

    using (var document1 = htmlConverter.Convert(finalHtml, string.Empty))
    using (var stream1 = new MemoryStream())
    {
        document1.Save(stream1);
        document1.Close(true);

        using (var finalDoc = new PdfDocument())
        {
            finalDoc.PageSettings.Size = PdfPageSize.A4;
            Stream[] streams = { stream1 };
            PdfDocumentBase.Merge(finalDoc, streams);

            using (var reportStream = new MemoryStream())
            {
                finalDoc.Save(reportStream);
                finalDoc.Close(true);

                return File(reportStream.ToArray(), "application/pdf", "Receipt.pdf");
            }
        }
    }
}

}