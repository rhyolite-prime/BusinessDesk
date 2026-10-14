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
using TopazERP.Authorization;
using TopazERP.Controllers;
using TopazERP.Services.Ap.Reports;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Ap_Reports)]
public class ApReportsController: TopazERPControllerBase
{
    
    private readonly IApReportsAppService _apReportsAppService;
    private readonly IWebHostEnvironment _webHostEnvironment;
    
    public ApReportsController(IApReportsAppService apReportsAppService, IWebHostEnvironment webHostEnvironment)
    {
        _apReportsAppService = apReportsAppService;
        _webHostEnvironment = webHostEnvironment;
    }
    
    [AbpAuthorize(PermissionNames.Ap_Reports_Suppliers)]
    public IActionResult Suppliers()
    {
        return View();
    }
    public IActionResult GlTransactions()
    {
        return View();
    }
    public IActionResult AuditLogs()
    {
        return View();
    }
    public IActionResult InvoiceReport(Guid id)
    {
        dynamic viewModel = new ExpandoObject();
        viewModel.Id = id;
        return View(viewModel);
    }
    public IActionResult PrintPaymentReceipt(Guid id)
    {
        dynamic viewModel = new ExpandoObject();
        viewModel.Id = id;
        return View(viewModel);
    }
    public IActionResult PrintPaymentVoucher(Guid id)
    {
        dynamic viewModel = new ExpandoObject();
        viewModel.Id = id;
        return View(viewModel);
    }
    public IActionResult PrintOpeningBalance(Guid supplierId)
    {
        dynamic viewModel = new ExpandoObject();
        viewModel.SupplierId = supplierId;
        return View(viewModel);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GrGetSuppliers()
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("SUPPLIER LIST");
        var reportDetails = await _apReportsAppService.GetSuppliers();

        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceDetails([FromQuery]Guid id)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP INVOICE");
        var reportDetails = await _apReportsAppService.GetInvoiceReport(id);
        return Json(new { reportHeader, reportDetails });
    }
    
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetSuppliersByGroup(Guid supplierGroupId, string supplierGroupName)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"SUPPLIER LIST FOR {supplierGroupName}");
        var reportDetails = await _apReportsAppService.GetSuppliersByGroup(supplierGroupId);

        return Json(new { reportHeader, reportDetails });
    }
    
    [AbpAuthorize(PermissionNames.Ap_Reports_Statement)]
    public IActionResult Statement()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ap_Reports_Statement)]
    public IActionResult StatementByOu()
    {
        return View();
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult>GetStatement(Guid supplierId)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader(
            $"ACCOUNT PAYABLE STATEMENT");
        var reportDetails = await _apReportsAppService.GetStatement(supplierId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async  Task<ActionResult> GetStatementType2(Guid supplierId, DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader(
            $"For The Period {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _apReportsAppService.GetStatementType2(supplierId, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async  Task<ActionResult> GetStatementType3(Guid supplierId, DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("For The Period " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _apReportsAppService.GetStatementType3(supplierId, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async  Task<ActionResult> GetStatementByOu(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate, string ouName)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader(
            $"{ouName.ToUpper()} Statement For The Period {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _apReportsAppService.GetStatementByOu(supplierId, ouid, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async  Task<ActionResult> GetStatementByOuType2(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate, string ouName)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader(
            $"{ouName.ToUpper()} Statement For The Period {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _apReportsAppService.GetStatementByOuType2(supplierId, ouid, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [AbpAuthorize(PermissionNames.Ap_Reports_Invoices)]
    public IActionResult Invoice()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Ap_Reports_Invoices)]
    public IActionResult CanceledInvoices()
    {
        return View();
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoice(Guid supplierId)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE SUPPLIER INVOICES");
        var reportDetails = await _apReportsAppService.GetInvoice(supplierId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAllInvoices()
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE INVOICES");
        var reportDetails = await _apReportsAppService.GetAllInvoices();
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetCanceledInvoices()
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE CANCELED INVOICES");
        var reportDetails = await _apReportsAppService.GetCanceledInvoices();
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByBatch(string batchNumber)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE INVOICE BY BATCH NUMBER: " + batchNumber);
        var reportDetails = await _apReportsAppService.GetInvoiceByBatch(batchNumber);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByInvoiceNumber(string invoiceNumber)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE INVOICE BY INVOICE NUMBER: " + invoiceNumber);
        var reportDetails = await _apReportsAppService.GetInvoiceByInvoiceNumber(invoiceNumber);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByDate(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE INVOICES FROM " + startDate.ToString("dd/MM/yyyy") + " TO " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _apReportsAppService.GetInvoiceByDate(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceByInvoiceNumberRange(int startNumber, int endNumber)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("ACCOUNT PAYABLE INVOICES FROM " + startNumber + " TO " + endNumber);
        var reportDetails = await _apReportsAppService.GetInvoiceByRange(startNumber, endNumber);
        return Json(new { reportHeader, reportDetails });
    }
    
    [AbpAuthorize(PermissionNames.Ap_Reports_InvoiceDetails)]
    public IActionResult InvoiceDetails()
    {
        return View();
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoiceReport(Guid id)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP INVOICE");
        var reportDetails = await _apReportsAppService.GetInvoiceReport(id);
        return Json(new { reportHeader, reportDetails });
    }
   
    
    [AbpAuthorize(PermissionNames.Ap_Reports_OpeningBalances)]
    public IActionResult GrOpeningBalances()
    {
        return View();
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetOpeningBalances(string status)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"AP OPENING BALANCES - {status.ToUpper()}");
        var reportDetails = await _apReportsAppService.GetOpeningBalances(status);
        return Json(new { reportHeader, reportDetails });
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetOpeningBalancesBySupplier(Guid supplierId, string status)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"AP OPENING BALANCES- {status.ToUpper()}");
        var reportDetails = await _apReportsAppService.GetOpeningBalancesBySupplier(supplierId, status);
        return Json(new { reportHeader, reportDetails });
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAllConvertedOpeningBalances(string status)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"AP Opening Balances Converted To Ghana Cedis- {status.ToUpper()}");
        var reportDetails = await _apReportsAppService.GetAllConvertedOpeningBalances(status);
        return Json(new { reportHeader, reportDetails });
    }

    
    [AbpAuthorize(PermissionNames.Ap_Reports_Payments)]
    public IActionResult Payments()
    {
        return View();
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPayments()
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT HISTORY");
        var reportDetails = await _apReportsAppService.GetPayments();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentsBySupplier(Guid supplierId)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT HISTORY");
        var reportDetails = await _apReportsAppService.GetPaymentsBySupplier(supplierId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentsByDate(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP Payment History For Period " + startDate.ToString("dd/MM/yyyy") + " to " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _apReportsAppService.GetPaymentsByDate(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentReceipts(Guid id)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT RECEIPT");
        var reportDetails = await _apReportsAppService.GetPaymentReceipts(id);
        return Json(new { reportHeader, reportDetails });
    }
    
    
    [AbpAuthorize(PermissionNames.Ap_Reports_Vouchers)]
    //vouchers
    public IActionResult Vouchers()
    {
        return View();
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetVouchers()
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHERS");
        var reportDetails = await _apReportsAppService.GetVouchers();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetVouchersBySupplier(Guid supplierId)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHERS");
        var reportDetails = await _apReportsAppService.GetVouchersBySupplier(supplierId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetVouchersByDate(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHERS FROM " + startDate.ToString("dd/MM/yyyy") + " TO " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _apReportsAppService.GetVouchersByDate(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetVouchersByInvoice(string invoiceId)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHERS BY INVOICE");
        var reportDetails = await _apReportsAppService.GetVoucherByInvoice(invoiceId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetVoucherDetails(Guid voucherId)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHER");
        var reportDetails = await _apReportsAppService.GetVoucherDetails(voucherId);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetPaymentVoucher(Guid id)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHER");
        var reportDetails = await _apReportsAppService.GetPaymentVoucher(id);
        return Json(new { reportHeader, reportDetails });
    }
    public async Task<ActionResult> GetPaymentVouchers([FromBody] List<Guid> ids)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT VOUCHER");
        var reportDetails = await _apReportsAppService.GetPaymentVouchers(ids);
        return Json(new { reportHeader, reportDetails });
    }
    public async Task<ActionResult> GetPaymentReceiptsBulk([FromBody] List<Guid> ids)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP PAYMENT RECEIPT");
        var reportDetails = await _apReportsAppService.GetPaymentReceipts(ids);
        return Json(new { reportHeader, reportDetails });
    }
    [AbpAuthorize(PermissionNames.Ap_Reports_Aging)]
    //Ageing report
    public IActionResult AgeingReport()
    {
        return View();
    }
    
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetInvoicePdf(Guid id)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP INVOICE");
        var reportDetails = await _apReportsAppService.GetInvoiceDetails(id);
        return Json(new { reportHeader, reportDetails });
    }

    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAgeingSummary(DateTime startDate, int agingInterval)
    {
        
        var reportHeader = await _apReportsAppService.GetReportHeader($"Accounts Payable Aging Balances As Of " + startDate.ToString("dddd, MMMM dd, yyyy"));
        var reportDetails = await _apReportsAppService.GetAgingSummary(startDate, agingInterval);
    
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAgeingBySupplier(Guid supplierId, DateTime startDate, int agingInterval)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"Accounts Payable Aging Balances As Of " + startDate.ToString("dddd, MMMM dd, yyyy"));
        var reportDetails = await _apReportsAppService.GetAgeingBySupplier(supplierId, startDate, agingInterval);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetAgeingByDate(DateTime startDate, int agingInterval)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"Accounts Payable Aging Balances As Of " + startDate.ToString("dddd, MMMM dd, yyyy"));
        var reportDetails = await _apReportsAppService.GetAgeingByDate(startDate, agingInterval);
        return Json(new { reportHeader, reportDetails });
    }
    
    [AbpAuthorize(PermissionNames.Ap_Reports_DebitMemo)]
    public IActionResult DebitMemo()
    {
        return View();
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetDebitMemo()
    {
        var reportHeader = await _apReportsAppService.GetReportHeader("AP DEBIT MEMO");
        var reportDetails = await _apReportsAppService.GetDebitMemo();
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetGlTransactions(DateTime startDate, DateTime endDate, bool isMultiCurrency = false)
    {
        var reportHeader = await _apReportsAppService.GetReportHeader($"AP GL Transaction For Period {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _apReportsAppService.GetGlTransaction(startDate, endDate, isMultiCurrency);
        return Json(new { reportHeader, reportDetails });
    }

    
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
public async Task<IActionResult> GetInvoiceInPdf(Guid id)
{
    // 1️⃣ Fetch invoice data
    dynamic invoiceData = await _apReportsAppService.GetInvoiceDetails(id);
    if (invoiceData is IDictionary<string, object> errorMessage && errorMessage.ContainsKey("message"))
    {
        return BadRequest(errorMessage["message"]);
    }
    // Use ReportHeader from invoiceData instead of fetching it separately
    var reportHeader = invoiceData.ReportHeader;
    var supplierInfo = invoiceData.SupplierInfo;
    var invoiceDetails = invoiceData.InvoiceDetails;
   // var taxLevies = invoiceData.InvoiceTaxLevies;
    var referenceNumber = invoiceData.ReferenceNumber;
    // Load HTML template
    var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "invoice.html");
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
        .Replace("{{SupplierName}}", supplierInfo.SupplierName)
        .Replace("{{SupplierAddress}}", supplierInfo.SupplierAddress)
        .Replace("{{SupplierPhoneNo}}", supplierInfo.SupplierPhoneNo)
        .Replace("{{AccountNumber}}", supplierInfo.AccountNumber)
        .Replace("{{ContactPerson}}", supplierInfo.ContactPerson)
        .Replace("{{VatNumber}}", supplierInfo.VatNumber)
        .Replace("{{CreditLimit}}", supplierInfo.CreditLimit.ToString("N2"))
        .Replace("{{PurchaseOrderNumber}}", invoiceData.PurchaseOrderNumber)
        .Replace("{{VatAmount}}", invoiceData.VatAmount.ToString("N2"))
        .Replace("{{ReportTitle}}", reportHeader.ReportTitle)
        .Replace("{{ReferenceNumber}}", referenceNumber)
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
        generatedRows.Append($"<td class='quantity'></td>");
        generatedRows.Append($"<td class='amount'></td>");
        generatedRows.Append($"<td class='amount'>{(row.SubTotal != null ? row.SubTotal.ToString("N2") : "0.00")}</td>");
        generatedRows.Append("</tr>");
    }
    /*var generatedRows1 = new StringBuilder();
    foreach (var row in taxLevies)
    {
        generatedRows1.Append("<tr>");
        generatedRows1.Append($"<td><div>{row.Index}</div></td>");
        generatedRows1.Append($"<td class='description'><div>{row.Description}</div></td>");
        generatedRows1.Append($"<td class='quantity'></td>");
        generatedRows1.Append($"<td class='amount'><div></div></td>");
        generatedRows1.Append($"<td class='amount'>{(row.SubTotal != null ? row.SubTotal.ToString("N2") : "0.00")}</td>");
        generatedRows1.Append("</tr>");
    }*/
       
      
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


    
    /*private string GenerateInvoiceTable(dynamic invoiceData)
    {
        var invoiceItems = invoiceData.invoiceDetails;
        var tableRows = new StringBuilder();

        foreach (var i in invoiceItems)
        {
            tableRows.Append("<tr>");
            tableRows.Append($"<td>{Convert.ToInt32(i.Index)}</td>");
            tableRows.Append($"<td>{Convert.ToString(i.Description)}</td>");
            tableRows.Append($"<td>{(i.Amount != null ? Convert.ToInt32(i.Amount) : 0)}</td>");
            tableRows.Append("</tr>");
        }

        return tableRows.ToString();
    }*/


    
}