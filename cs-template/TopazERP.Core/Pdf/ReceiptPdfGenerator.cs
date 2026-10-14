using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Abp.Domain.Services;
using Microsoft.AspNetCore.Hosting;
using Syncfusion.HtmlConverter;
using Syncfusion.Pdf;
using TopazERP.DomainServices.Ar.Reports.Dto;

namespace TopazERP.Pdf;

public class ReceiptPdfGenerator: DomainService, IReceiptPdfGenerator
{
    private readonly IWebHostEnvironment _webHostEnvironment;

    public ReceiptPdfGenerator(IWebHostEnvironment webHostEnvironment)
    {

        _webHostEnvironment = webHostEnvironment;
    }
   public async Task<byte[]> RenderPdf(List<PaymentReceipts> receipts)
{
    try
    {
        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "ar-payment-receipt.html");
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

            if (pageNumber < receipts.Count)
            {
                finalHtmlBuilder.Append("<div style='page-break-after: always;'></div>");
            }

            pageNumber++;
        }

        var finalHtml = finalHtmlBuilder.ToString();
        finalHtml = finalHtml.Replace("{{PageBreakCount}}", receipts.Count.ToString());

        // Convert HTML to PDF
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
        Logger.Error($" exception: {e.Message}");
        Logger.Error($"exception: {e.StackTrace}");
        return null;
    }
}



}