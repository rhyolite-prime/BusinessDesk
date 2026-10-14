using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Abp.Domain.Services;
using Microsoft.AspNetCore.Hosting;
using Syncfusion.HtmlConverter;
using Syncfusion.Pdf;
using TopazERP.DomainServices.Ar.Reports.Dto;

namespace TopazERP.Pdf;

public class ArInvoicePdfGenerator: DomainService, IArInvoicePdfGenerator
{
    private readonly IWebHostEnvironment _webHostEnvironment;

    public ArInvoicePdfGenerator(IWebHostEnvironment webHostEnvironment)
    {

        _webHostEnvironment = webHostEnvironment;
    }
    
    public async Task<byte[]> RenderPdf(InvoiceData invoice)
    {
        try
        {
            var referenceNumber = invoice.ReferenceNumber;
            var reportHeader = invoice.ReportHeader;
            var customerInfo = invoice.CustomerInfo;
            var invoiceDetails = invoice.InvoiceDetails;
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "arinvoice.html");
            var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

            var finalHtml = htmlTemplate
                .Replace("{{CompanyName}}", reportHeader.CompanyName)
                .Replace("{{Address}}", reportHeader.Address)
                .Replace("{{PrimaryPhoneNo}}", reportHeader.PrimaryPhoneNo)
                .Replace("{{Email}}", reportHeader.Email)
                .Replace("{{CompanyLogo}}", reportHeader.CompanyLogo)
                .Replace("{{InvoiceNumber}}", invoice.InvoiceNumber)
                .Replace("{{InvoiceDate}}", invoice.InvoiceDate)
                .Replace("{{ProjectedPayDate}}", invoice.ProjectedPayDate)
                .Replace("{{Balance}}", invoice.Balance.ToString("N2"))
                .Replace("{{TotalInvoiceAmount}}", invoice.TotalInvoiceAmount.ToString("N2"))
                .Replace("{{TotalDiscount}}", invoice.TotalDiscount.ToString("N2"))
                .Replace("{{TotalBeforeDiscount}}", invoice.TotalBeforeDiscount.ToString("N2"))
                .Replace("{{AmountInWords}}", invoice.AmountInWords)
                .Replace("{{CurrencyName}}", invoice.CurrencyName)
                .Replace("{{CustomerName}}", customerInfo.CustomerName)
                .Replace("{{CustomerAddress}}", customerInfo.CustomerAddress)
                .Replace("{{CustomerPhoneNo}}", customerInfo.CustomerPhoneNo)
                .Replace("{{AccountNumber}}", customerInfo.AccountNumber)
                .Replace("{{ContactPerson}}", customerInfo.ContactPerson)
                .Replace("{{VatNumber}}", customerInfo.VatNumber)
                .Replace("{{CreditLimit}}", customerInfo.CreditLimit.ToString("N2"))
                .Replace("{{PurchaseOrderNumber}}", invoice.PurchaseOrderNumber)
                .Replace("{{VatAmount}}", invoice.VatAmount.ToString("N2"))
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

                        return reportStream.ToArray();
                    }
                }
            }
        }
        catch (Exception e)
        {
            Logger.Error($"ApInvoicePdfGenerator exception: {e.Message}");
            Logger.Error($"ApInvoicePdfGenerator exception: {e.StackTrace}");
            return null;
        }
            

           

    }
}