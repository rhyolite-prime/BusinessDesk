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
using TopazERP.DomainServices.Ap.Reports.Dto;
using TopazERP.DomainServices.Ar.ArPayments;
using TopazERP.DomainServices.Ar.Quotations;
using TopazERP.DomainServices.Ar.Reports;
using TopazERP.DomainServices.Ar.Reports.Dto;
using TopazERP.Models.Ap;
using TopazERP.Models.Ar;
using TopazERP.Models.Shared;
using TopazERP.Notifications.Dto;
using TopazERP.Pdf;
using InvoiceData = TopazERP.DomainServices.Ar.Reports.Dto.InvoiceData;
using PaymentReceipts = TopazERP.DomainServices.Ar.Reports.Dto.PaymentReceipts;
using ReportHeader = TopazERP.DomainServices.Ar.Reports.Dto.ReportHeader;


namespace TopazERP.DomainServices.Ar.EmailInvoices
{
    public class EmailInvoicesManager: Abp.Domain.Services.DomainService, IEmailInvoicesManager
    {
        private readonly IArReportManager _arReportManager;
        private readonly IRepository<Customer, Guid> _repositoryCustomer;
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
        private readonly IRepository<ArInvoice, Guid> _repositoryArInvoice;
        private readonly IArInvoicePdfGenerator _arInvoicePdfGenerator;
        private readonly IRepository<Quotation, Guid> _repositoryQuotation;
        private readonly IQuotationPdfGenerator _quotationPdfGenerator;
        private readonly IRepository<Currency, Guid> _repositoryCurrency;
        private readonly IRepository<ArInvoicePaymentRecords, Guid> _repositoryArPayment;
        private readonly IReceiptPdfGenerator _receiptPdfGenerator;
        public EmailInvoicesManager(IArReportManager arReportManager, IRepository<Customer, Guid> repositoryCustomer, IRepository<CompanyProfile, Guid> repositoryCompanyProfile, IRepository<ArInvoice, Guid> repositoryArInvoice, IArInvoicePdfGenerator arInvoicePdfGenerator, IRepository<Quotation, Guid> repositoryQuotation, IRepository<ArInvoicePaymentRecords, Guid> repositoryArPayment, IRepository<Currency, Guid> repositoryCurrency, IQuotationPdfGenerator quotationPdfGenerator, IReceiptPdfGenerator receiptPdfGenerator)
        {
            _arReportManager = arReportManager;
            _repositoryCustomer = repositoryCustomer;
            _repositoryCompanyProfile = repositoryCompanyProfile;
            _repositoryArInvoice = repositoryArInvoice;
            _arInvoicePdfGenerator = arInvoicePdfGenerator;
            _repositoryQuotation = repositoryQuotation;
            _repositoryArPayment = repositoryArPayment;
            _repositoryCurrency = repositoryCurrency;
            _quotationPdfGenerator = quotationPdfGenerator;
            _receiptPdfGenerator = receiptPdfGenerator;
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
        public async Task<object> DispatchInvoice(EmailArInvoiceDto dto)
        {
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == dto.CustomerId);
            if (customer == null) return new { message = "Customer not found." };

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
                To = new List<string> { customer.Email },
                Subject = $"Ar Invoices Dispatch - {companyProfile.CompanyName}",
                Body = $"Dear {customer.ContactPerson ?? customer.Name},<br/><br/>Please find attached your invoices.<br/><br/>Regards,<br/>{companyProfile.CompanyName}"
            };

            email.To.Add(customer.Email);

            var dispatchedInvoices = new List<string>();

            foreach (var invoiceId in dto.InvoiceIds)
            {
                var invoice = await _repositoryArInvoice.FirstOrDefaultAsync(i => i.Id == invoiceId && i.IsCanceled == false);
                if (invoice == null) continue;

                var invoiceDetails = (invoice.Details ?? new List<ArInvoiceDetail>())
                    .Select((d, index) => new ArInvoiceDetailDto
                    {
                        Index = index + 1,
                        Description = d.Description,
                        UnitPrice = (d.UnitPrice * d.Quantity) - d.Amount,
                        ReferenceNumber = d.ReferenceNo,
                        Quantity = d.Quantity,
                        Amount = d.Amount.ToString(),
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

                var customerInfo = new CustomerInfo
                {
                    CustomerName = customer.Name,
                    AccountNumber = customer.AccountNumber,
                    CustomerAddress = customer.Address,
                    CustomerPhoneNo = customer.PhoneNo,
                    ContactPerson = customer.ContactPerson,
                    VatNumber = customer.VatNumber,
                    CreditLimit = customer.CreditLimit,
                    Email = customer.Email,
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
                    CustomerInfo = customerInfo,
                    InvoiceDetails = invoiceDetails,
                    ReferenceNumber = invoiceDetails.FirstOrDefault()?.ReferenceNumber,
                    //  SmtpCredentials = smtpCredentials,
                };
        
                var fileBytes = await _arInvoicePdfGenerator.RenderPdf(invoiceData);
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
                message = $"Invoices [{string.Join(", ", dispatchedInvoices)}] dispatched successfully to {customer.Email}."
            };
        }
        public async Task<object> DispatchQuotation(EmailQuotationDto dto)
        {
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == dto.CustomerId);
            if (customer == null) return new { message = "Customer not found." };

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
                To = new List<string> { customer.Email },
                Subject = $"Quotations Dispatch - {companyProfile.CompanyName}",
                Body = $"Dear {customer.ContactPerson ?? customer.Name},<br/><br/>Please find attached your quotations.<br/><br/>Regards,<br/>{companyProfile.CompanyName}"
            };

            email.To.Add(customer.Email);

            var dispatchedQuotations = new List<string>();

            foreach (var quotationId in dto.QuotationIds)
            {
                var quotation = await _repositoryQuotation.FirstOrDefaultAsync(i => i.Id == quotationId);
                if (quotation == null) continue;
                bool allAmountsAreZero = (quotation.Details ?? new List<QuotationDetail>())
                    .All(d => d.Amount == 0);
                var quotationDetails = (quotation.Details ?? new List<QuotationDetail>())
                    .Select((d, index) => new QuotationDetailDto
                    {
                        Index = index + 1,
                        Description = d.Description,
                        UnitPrice = (d.UnitPrice * d.Quantity) - d.Amount,
                        ReferenceNumber = d.ReferenceNo,
                        Quantity = d.Quantity,
                        Amount = allAmountsAreZero ? " " : d.Amount.ToString("0.00"),
                        SubTotal = d.SubTotal
                    })
                    .ToList();

                var reportHeader = new ReportHeader
                {
                    CompanyName = companyProfile.CompanyName,
                    PrimaryPhoneNo = $"Tel: {companyProfile.PhoneNo}",
                    Address = companyProfile.Address,
                    Email = $"Email: {companyProfile.Email}",
                    ReportTitle = $"QUOTATION",
                    CompanyLogo = companyProfile.CompanyLogo != null
                        ? $"data:image/png;base64,{Convert.ToBase64String(companyProfile.CompanyLogo)}"
                        : null
                };

                var customerInfo = new CustomerInfo
                {
                    CustomerName = customer.Name,
                    AccountNumber = customer.AccountNumber,
                    CustomerAddress = customer.Address,
                    CustomerPhoneNo = customer.PhoneNo,
                    ContactPerson = customer.ContactPerson,
                    VatNumber = customer.VatNumber,
                    CreditLimit = customer.CreditLimit,
                    Email = customer.Email,
                };

                var totalAmount = quotationDetails.Sum(d => d.SubTotal);
                var totalBeforeDiscount = quotationDetails.Sum(i => i.AmountBeforeDiscount);
                var currency = await _repositoryCurrency.FirstOrDefaultAsync(c => c.CurrencyName == quotation.CurrencyName);
                var minorName = currency != null ? currency.MinorName : "peswas";
                var quotationData = new QuotationData
                {
                    QuotationNumber = quotation.QuotationNumber,
                    QuotationDate = quotation.QuotationDate.ToString("dd-MMM-yyyy"),
                    TotalAmount = totalAmount,
                    CurrencyName = quotation.CurrencyName,
                    AmountInWords = ConvertAmountToWords(totalAmount, quotation.CurrencyName, minorName),
                    TotalBeforeDiscount = totalBeforeDiscount,
                    TotalDiscount = quotationDetails.Sum(i => string.IsNullOrWhiteSpace(i.Amount) ? 0 : Convert.ToDecimal(i.Amount)),
                    ReportHeader = reportHeader,
                    CustomerInfo = customerInfo,
                    Details = quotationDetails,
                    ReferenceNumber = quotationDetails.FirstOrDefault()?.ReferenceNumber,
                    Notes = quotation.Notes
                };
        
                var fileBytes = await _quotationPdfGenerator.RenderPdf(quotationData);
                if (fileBytes == null || fileBytes.Length == 0)
                {
                    return new
                    {
                        code = 500,
                        message = $"Quotation {quotation.QuotationNumber} could not be generated as PDF."
                    };
                }
                var fileName = $"Quotation_{quotation.QuotationNumber}.pdf";
                email.Attachments.Add((fileBytes, fileName, "application/pdf"));


                dispatchedQuotations.Add(quotation.QuotationNumber);
            }
    
            await SendWithCompanyCredentials(email, smtpCredentials);
            return new
            {
                code = 200,
                message = $"Quotation(s) [{string.Join(", ", dispatchedQuotations)}] dispatched successfully to {customer.Email}."
            };
        }
        
        public async Task<object> DispatchPaymentReceipt(EmailPaymentReceiptDto dto)
        {
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(s => s.Id == dto.CustomerId);
            if (customer == null) return new { message = "Customer not found." };

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
                To = new List<string> { customer.Email },
                Subject = $"Payment Receipt Dispatch - {companyProfile.CompanyName}",
                Body = $"Dear {customer.ContactPerson ?? customer.Name},<br/><br/>Please find attached your receipt(s).<br/><br/>Regards,<br/>{companyProfile.CompanyName}"
            };

            var dispatchedReceipts = new List<string>();
            if (dispatchedReceipts == null) throw new ArgumentNullException(nameof(dispatchedReceipts));

            foreach (var paymentId in dto.PaymentIds)
            {
                // get ALL records for this payment
                var paymentRecords = await _repositoryArPayment.GetAllListAsync(r => r.PaymentId == paymentId);
                if (paymentRecords == null || paymentRecords.Count == 0) continue;

                var receipts = new List<PaymentReceipts>();

                foreach (var record in paymentRecords)
                {
                    var invoice = await _repositoryArInvoice.FirstOrDefaultAsync(i => i.Id == record.InvoiceId);
                    var currency = await _repositoryCurrency.FirstOrDefaultAsync(c => c.CurrencyName == record.CurrencyName);
                    var minorName = currency != null ? currency.MinorName : "peswas";

                    receipts.Add(new PaymentReceipts
                    {
                        CustomerName = record.CustomerName,
                        PaymentDate = record.PaymentDate.ToString("dd-MMM-yyyy"),
                        CurrencyName = record.CurrencyName,
                        CurrencyCode = record.CurrencyCode,
                        PaidAmount = record.Amount,
                        AmountInWords = ConvertAmountToWords(record.Amount, record.CurrencyName, minorName),
                        ModeOfPayment = record.ModeOfPayment,
                        ChequeNo = record.ChequeNo,
                        BankBranch = record.BankBranch,
                        BankName = record.BankName,
                        InvoiceNo = invoice != null ? invoice.InvoiceNumber : "N/A",
                        ReceiptNo = record.ReceiptNo
                    });
                }
                // render multiple receipts into one PDF (with page breaks)
                var fileBytes = await _receiptPdfGenerator.RenderPdf(receipts);
                if (fileBytes == null || fileBytes.Length == 0)
                {
                    return new
                    {
                        code = 500,
                        message = $"Receipt(s) for payment {paymentId} could not be generated as PDF."
                    };
                }

                var fileName = $"Receipt_{paymentId}.pdf";
                email.Attachments.Add((fileBytes, fileName, "application/pdf"));

                dispatchedReceipts.Add(paymentId.ToString());
            }

            await SendWithCompanyCredentials(email, smtpCredentials);

            return new
            {
                code = 200,
                message = $"Receipt(s) dispatched successfully to {customer.Email}."
            };
        }
    }
}

