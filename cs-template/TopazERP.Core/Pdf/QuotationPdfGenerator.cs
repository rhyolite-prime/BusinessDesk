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

public class QuotationPdfGenerator: DomainService, IQuotationPdfGenerator
{
    private readonly IWebHostEnvironment _webHostEnvironment;

    public QuotationPdfGenerator(IWebHostEnvironment webHostEnvironment)
    {

        _webHostEnvironment = webHostEnvironment;
    }

    public async Task<byte[]> RenderPdf(QuotationData quotation)
    {
        try
        {
            var referenceNumber = quotation.ReferenceNumber;
            var reportHeader = quotation.ReportHeader;
            var customerInfo = quotation.CustomerInfo;
            var details = quotation.Details;
            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "quotation.html");
            var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

            var finalHtml = htmlTemplate
                .Replace("{{CompanyName}}", reportHeader.CompanyName)
                .Replace("{{Address}}", reportHeader.Address)
                .Replace("{{PrimaryPhoneNo}}", reportHeader.PrimaryPhoneNo)
                .Replace("{{Email}}", reportHeader.Email)
                .Replace("{{CompanyLogo}}", reportHeader.CompanyLogo)
                .Replace("{{QuotationNumber}}", quotation.QuotationNumber)
                .Replace("{{QuotationDate}}", quotation.QuotationDate)
                .Replace("{{TotalAmount}}", quotation.TotalAmount.ToString("N2"))
                .Replace("{{TotalDiscount}}", quotation.TotalDiscount.ToString("N2"))
                .Replace("{{TotalBeforeDiscount}}", quotation.TotalBeforeDiscount.ToString("N2"))
                .Replace("{{AmountInWords}}", quotation.AmountInWords)
                .Replace("{{Notes}}", quotation.Notes)
                .Replace("{{CurrencyName}}",quotation.CurrencyName)
                .Replace("{{CustomerName}}", customerInfo.CustomerName)
                .Replace("{{CustomerAddress}}", customerInfo.CustomerAddress)
                .Replace("{{CustomerPhoneNo}}", customerInfo.CustomerPhoneNo)
                .Replace("{{AccountNumber}}", customerInfo.AccountNumber)
                .Replace("{{ContactPerson}}", customerInfo.ContactPerson)
                .Replace("{{VatNumber}}", customerInfo.VatNumber)
                
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

            foreach (var row in details)
            {
                generatedRows.Append("<tr>");
                generatedRows.Append($"<td>{row.Index}</td>");
                generatedRows.Append($"<td class='description'>{row.Description}</td>");
                generatedRows.Append($"<td class='quantity'>{row.Quantity}</td>");
                generatedRows.Append(
                    $"<td class='amount'>{(row.UnitPrice != null ? row.UnitPrice.ToString("N2") : "0.00")}</td>");
                generatedRows.Append(
                    $"<td class='amount'>{(row.AmountBeforeDiscount != null ? row.AmountBeforeDiscount.ToString("N2") : "0.00")}</td>");
                generatedRows.Append($"<td class='amount'>{(row.Amount != null ? row.Amount : "0.00")}</td>");
                generatedRows.Append(
                    $"<td class='amount'>{(row.SubTotal != null ? row.SubTotal.ToString("N2") : "0.00")}</td>");
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