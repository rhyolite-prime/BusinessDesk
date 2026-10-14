using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Ap.Reports;
using TopazERP.DomainServices.Ap.Reports.Dto;
using TopazERP.Models.Ap;
using TopazERP.Models.Shared;
using TopazERP.Notifications.Dto;
using TopazERP.Pdf;

namespace TopazERP.DomainServices.Ap.EmailInvoices;

public class EmailInvoicesManager: Abp.Domain.Services.DomainService, IEmailInvoicesManager
{
    private readonly IApReportManager _apReportManager;
    private readonly IRepository<Supplier, Guid> _repositorySupplier;
    private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
    private readonly IRepository<ApInvoice, Guid> _repositoryApInvoice;
    private readonly IApInvoicePdfGenerator _apInvoicePdfGenerator;
    
    public EmailInvoicesManager(IApReportManager apReportManager, IRepository<Supplier, Guid> repositorySupplier, IRepository<CompanyProfile, Guid> repositoryCompanyProfile, IRepository<ApInvoice, Guid> repositoryApInvoice, IApInvoicePdfGenerator apInvoicePdfGenerator)
    {
        _apReportManager = apReportManager;
        _repositorySupplier = repositorySupplier;
        _repositoryCompanyProfile = repositoryCompanyProfile;
        _repositoryApInvoice = repositoryApInvoice;
        _apInvoicePdfGenerator = apInvoicePdfGenerator;
    }
    private string ConvertAmountToWords(decimal amount, string majorName, string minorName)
    {
        if (amount == 0) return "Zero";

        var unitsMap = new[]
        {
            "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
        };
        var tensMap = new[] { "Zero", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

        var words = "";

        long integerPart = (long)amount;
        // Extract fractional part
        int fractionalPart = (int)((amount - integerPart) * 100); 

        // Convert integer part
        if (integerPart > 0)
        {
            words += ConvertIntegerToWords(integerPart, unitsMap, tensMap) + " " + majorName;
        }

        // Convert fractional part
        if (fractionalPart > 0)
        {
            if (!string.IsNullOrEmpty(words)) words += " and ";
            words += ConvertIntegerToWords(fractionalPart, unitsMap, tensMap) + " " + minorName;
        }

        return words.Trim();
    }
    private string ConvertIntegerToWords(long number, string[] unitsMap, string[] tensMap)
    { 
        if (number == 0) return "";
        var words = "";
        if (number / 1000000 > 0)
        {
            words += ConvertIntegerToWords(number / 1000000, unitsMap, tensMap) + " Million ";
            number %= 1000000;
        }
        if (number / 1000 > 0)
        {
            words += ConvertIntegerToWords(number / 1000, unitsMap, tensMap) + " Thousand ";
            number %= 1000;
        }
        if (number / 100 > 0)
        {
            words += ConvertIntegerToWords(number / 100, unitsMap, tensMap) + " Hundred ";
            number %= 100;
        }
        if (number > 0)
        {
            if (words != "") words += "and ";

            if (number < 20)
                words += unitsMap[number];
            else
            {
                words += tensMap[number / 10];
                if ((number % 10) > 0)
                    words += "-" + unitsMap[number % 10];
            }
        }

        return words.Trim();
    }
    public async Task SendWithCompanyCredentials(EmailMessage email, SmtpCredentials creds)
    {
        using var client = new SmtpClient(creds.MailHostName, creds.PortNumber)
        {
            Credentials = new NetworkCredential(creds.PrimaryEmailAddress, creds.EmailPassword),
            EnableSsl = creds.IsSSLEnabled
        };

        var mail = new MailMessage
        {
            From = new MailAddress(creds.PrimaryEmailAddress, creds.DefaultFromDisplayName),
            Subject = email.Subject,
            Body = email.Body,
            IsBodyHtml = true
        };

        foreach (var recipient in email.To)
            mail.To.Add(recipient);
            
        foreach (var attachment in email.Attachments)
        {
            var stream = new MemoryStream(attachment.Content);
            mail.Attachments.Add(new Attachment(stream, attachment.FileName, attachment.MimeType));
        }

        await client.SendMailAsync(mail);
    }
    public async Task<object> DispatchInvoice(EmailApInvoiceDto dto)
    {
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(s => s.Id == dto.SupplierId);
        if (supplier == null) return new { message = "Supplier not found." };

        var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();

        var smtpCredentials = new SmtpCredentials
        {
            PrimaryEmailAddress = companyProfile.PrimaryEmailAddress,
            EmailPassword = companyProfile.EmailPassword,
            MailHostName = companyProfile.MailHostName,
            PortNumber = companyProfile.PortNumber,
            IsSSLEnabled = companyProfile.IsSSLEnabled,
            DefaultFromDisplayName = companyProfile.CompanyName
        };

        var email = new EmailMessage
        {
            To = new List<string> { supplier.Email },
            Subject = $"Invoices Dispatch - {companyProfile.CompanyName}",
            Body = $"Dear {supplier.ContactPerson ?? supplier.Name},<br/><br/>Please find attached your invoices.<br/><br/>Regards,<br/>{companyProfile.CompanyName}"
        };

        email.To.Add(supplier.Email);

        var dispatchedInvoices = new List<string>();

        foreach (var invoiceId in dto.InvoiceIds)
        {
            var invoice = await _repositoryApInvoice.FirstOrDefaultAsync(i => i.Id == invoiceId && i.IsCanceled == false);
            if (invoice == null) continue;

            var invoiceDetails = (invoice.InvoiceDetails ?? new List<ApInvoiceDetail>())
                .Select((d, index) => new InvoiceDetailDto
                {
                    Index = index + 1,
                    Description = d.Description,
                    UnitPrice = (d.UnitPrice * d.Quantity) - d.Amount,
                    ReferenceNumber = d.ReferenceNumber,
                    Quantity = d.Quantity,
                    Amount = d.Amount,
                    SubTotal = d.SubTotal
                })
                .ToList();

            var reportHeader = new ReportHeader
            {
                CompanyName = companyProfile.CompanyName,
                PrimaryPhoneNo = $"Tel: {companyProfile.PhoneNo}",
                Address = companyProfile.Address,
                Email = $"Email: {companyProfile.Email}",
                ReportTitle = $"INVOICE",
                CompanyLogo = companyProfile.CompanyLogo != null
                    ? $"data:image/png;base64,{Convert.ToBase64String(companyProfile.CompanyLogo)}"
                    : null
            };

            var supplierInfo = new SupplierInfo
            {
                SupplierName = supplier.Name,
                AccountNumber = supplier.AccountNumber,
                SupplierAddress = supplier.Address,
                SupplierPhoneNo = supplier.PhoneNo,
                ContactPerson = supplier.ContactPerson,
                VatNumber = supplier.VatNumber,
                CreditLimit = supplier.CreditLimit,
                Email = supplier.Email,
            };

            var invoiceData = new InvoiceData
            {
                InvoiceNumber = invoice.InvoiceNumber,
                InvoiceDate = invoice.InvoiceDate.ToString("dd-MMM-yyyy"),
                ProjectedPayDate = invoice.ProjectedPayDate.ToString("dd-MMM-yyyy"),
                Balance = invoice.Balance,
                TotalInvoiceAmount = invoice.TotalInvoiceAmount,
                CurrencyName = invoice.CurrencyName,
                VatAmount = invoice.vatAmount,
                PurchaseOrderNumber = invoice.PurchaseOrderNumber,
                AmountInWords = ConvertAmountToWords(invoice.TotalInvoiceAmount, invoice.CurrencyName, invoice.MinorName),
                ReportHeader = reportHeader,
                SupplierInfo = supplierInfo,
                InvoiceDetails = invoiceDetails,
                ReferenceNumber = invoiceDetails.FirstOrDefault()?.ReferenceNumber,
                //  SmtpCredentials = smtpCredentials,
            };
        
            var fileBytes = await _apInvoicePdfGenerator.RenderPdf(invoiceData);
            if (fileBytes == null || fileBytes.Length == 0)
            {
                return new
                {
                    code = 500,
                    message = $"Invoice {invoice.InvoiceNumber} could not be generated as PDF."
                };
            }
            var fileName = $"Invoice_{invoice.InvoiceNumber}.pdf";
            email.Attachments.Add((fileBytes, fileName, "application/pdf"));


            dispatchedInvoices.Add(invoice.InvoiceNumber);
        }
    
        await SendWithCompanyCredentials(email, smtpCredentials);
    

        return new
        {
            code = 200,
            message = $"Invoices [{string.Join(", ", dispatchedInvoices)}] dispatched successfully to {supplier.Email}."
        };
}
   
}