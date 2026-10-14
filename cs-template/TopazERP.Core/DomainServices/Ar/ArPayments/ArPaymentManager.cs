using Abp.Domain.Repositories;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Abp.Runtime.Session;
using Microsoft.EntityFrameworkCore;
using TopazERP.Authorization.Users;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ar.ArPayments;

public class ArPaymentManager: Abp.Domain.Services.IDomainService, IArPaymentManager
{
    private readonly IRepository<ArInvoice, Guid> _arInvoiceRepository;
    private readonly IRepository<ArPayment, Guid> _arPaymentRepository;
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    private readonly IRepository<ArInvoicePaymentRecords, Guid> _paymentRecordsRepository;
    private readonly IRepository<ArCreditMemo, Guid> _arCreditMemoRepository;
    private readonly IRepository<CompanyProfile, Guid> _companyProfileRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetails;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;
    
    public ArPaymentManager(IRepository<ArInvoice, Guid> arInvoiceRepository, IRepository<ArPayment, Guid> arPaymentRepository, IRepository<Customer, Guid> repositoryCustomer, IRepository<ArInvoicePaymentRecords, Guid> paymentRecordsRepository, IRepository<ArCreditMemo, Guid> arCreditMemoRepository, IRepository<CompanyProfile, Guid> companyProfileRepository, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetails, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<User, long> userRepository, IAbpSession abpSession)
    {
        _arInvoiceRepository = arInvoiceRepository;
        _arPaymentRepository = arPaymentRepository;
        _repositoryCustomer = repositoryCustomer;
        _paymentRecordsRepository = paymentRecordsRepository;
        _arCreditMemoRepository = arCreditMemoRepository;
        _companyProfileRepository = companyProfileRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetails = repositoryJournalDetails;
        _repositorySystemNumber = repositorySystemNumber;
        _userRepository = userRepository;
        _abpSession = abpSession;
    }
    
    public async Task<object> ListAll()
    {
        var paymentApproval = await _arPaymentRepository.GetAllListAsync();
        return paymentApproval;
    }
    
  
    public async Task<object> Create(ArPayment input)
    {
        input.CustomerName = input.CustomerName.Trim();
        if (string.IsNullOrWhiteSpace(input.BatchNumber) || input.BatchNumber.Trim() == "0")
        {
            input.BatchNumber = await GenerateBatchNumberAsync();
        }
        else
        {
            input.BatchNumber = input.BatchNumber.Trim();
        }

        var existingPayment = await _arPaymentRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new { code = 400, message = "Payment with the same batch number already exists." };
        }

        var invoices = await _arInvoiceRepository.GetAllListAsync(x => x.CustomerName == input.CustomerName);
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == input.CustomerId);
        if (customer == null)
        {
            return new { code = 404, message = "Customer not found." };
        }

        if (input.InvoiceList == null || !input.InvoiceList.Any())
        {
            return new { code = 400, message = "No invoices attached to the payment." };
        }
        if (!invoices.Any())
        {
            return new { code = 400, message = "No invoices available for payment." };
        }

        // Save the payment record
        var createdEntity = await _arPaymentRepository.InsertAsync(input);

        // Currency-aware allocation (DRAFT records)
        decimal remainingAmountToPay = input.AmountToPay;

        foreach (var invoice in invoices
                     .Where(x => input.InvoiceList.Select(i => i.Id).Contains(x.Id))
                     .OrderBy(x => x.ProjectedPayDate))
        {
            if (remainingAmountToPay <= 0) break;

            decimal paymentBuyRate = input.BuyRate > 0 ? input.BuyRate : 1;
            decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;
            decimal convertedAmount = remainingAmountToPay * (paymentBuyRate / invoiceBuyRate);

            decimal amountToAllocate = Math.Min(invoice.Balance, convertedAmount);
            decimal usedPaymentCurrency = amountToAllocate * (invoiceBuyRate / paymentBuyRate);
            var paymentRecord = new ArInvoicePaymentRecords
            {
                PaymentId = createdEntity.Id,
                InvoiceId = invoice.Id,
                Amount = input.AmountToPay,
                ConvertedAmount = amountToAllocate,
                PaymentDate = input.PaymentDate,
                BankName = input.BankName,
                BankBranch = input.BankBranch,
                CurrencyName = input.CurrencyName,
                CurrencyCode = input.CurrencyCode,
                ModeOfPayment = input.ModeOfPayment,
                ChequeNo = input.ChequeNumber,
                CustomerName = input.CustomerName,
                InvoiceNo = invoice.InvoiceNumber,
                IsPosted = false,
                ReceiptNo = $"RCPT-{new Random().Next(1000, 9999)}"
            };
            await _paymentRecordsRepository.InsertAsync(paymentRecord);

            remainingAmountToPay -= usedPaymentCurrency;
        }

        return new
        {
            id = createdEntity.Id,
            code = 200,
            message = "Payment created successfully (allocations saved as draft)."
        };
    }


    public async Task Update(ArPayment input)
    {
        // Update main payment
        await _arPaymentRepository.UpdateAsync(input);

        // Remove old unposted records for this payment (to avoid duplicates)
        var existingRecords = await _paymentRecordsRepository.GetAllListAsync(x => x.PaymentId == input.Id && !x.IsPosted);
        foreach (var record in existingRecords)
        {
            await _paymentRecordsRepository.DeleteAsync(record);
        }

        var invoices = await _arInvoiceRepository.GetAllListAsync(x => x.CustomerName == input.CustomerName);
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == input.CustomerId);
        decimal remainingAmountToPay = input.AmountToPay;

        foreach (var invoice in invoices
                     .Where(x => input.InvoiceList.Select(i => i.Id).Contains(x.Id))
                     .OrderBy(x => x.ProjectedPayDate))
        {
            if (remainingAmountToPay <= 0) break;

            decimal paymentBuyRate = input.BuyRate > 0 ? input.BuyRate : 1;
            decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;
            decimal convertedAmount = remainingAmountToPay * (paymentBuyRate / invoiceBuyRate);

       

            decimal amountToAllocate = Math.Min(invoice.Balance, convertedAmount);
            decimal usedPaymentCurrency = amountToAllocate * (invoiceBuyRate / paymentBuyRate);

            var paymentRecord = new ArInvoicePaymentRecords
            {
                PaymentId = input.Id,
                InvoiceId = invoice.Id,
                Amount = input.AmountToPay,
                ConvertedAmount = amountToAllocate,
                PaymentDate = input.PaymentDate,
                BankName = input.BankName,
                BankBranch = input.BankBranch,
                CurrencyName = input.CurrencyName,
                CurrencyCode = input.CurrencyCode,
                ModeOfPayment = input.ModeOfPayment,
                ChequeNo = input.ChequeNumber,
                CustomerName = input.CustomerName,
                InvoiceNo = invoice.InvoiceNumber,
                IsPosted = false,
            };
            await _paymentRecordsRepository.InsertAsync(paymentRecord);

            remainingAmountToPay -= usedPaymentCurrency;
        }
    }


    public async Task<ArInvoice> GetAsync(string customerName)
    {
        return await _arInvoiceRepository.FirstOrDefaultAsync(x => x.CustomerName == customerName);
    }

    public async Task<object> Delete(Guid Id)
    {
        await _arPaymentRepository.DeleteAsync(Id);
        return new { code = 200, message = "Payment deleted successfully." };
    }
    
    public async Task<object> PostPayments(List<Guid> paymentIds)
    {
        foreach (var paymentId in paymentIds)
        {
            var payment = await _arPaymentRepository.GetAsync(paymentId);

            if (payment == null) continue;

            if (!payment.IsPosted)
            {
                var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == payment.CustomerId);
                var defaultCurrency = customer?.CurrencyName;

                var invoices = await _arInvoiceRepository.GetAll()
                    .Where(x => payment.InvoiceList.Select(i => i.Id).Contains(x.Id) && x.IsPosted)
                    .OrderBy(x => x.ProjectedPayDate)
                    .ToListAsync();

                if (invoices == null || !invoices.Any())
                {
                    return new { code = 400, message = "No invoices available for posting." };
                }

                decimal remainingAmountToPay = payment.AmountToPay;
                // Create Journal Entry
                decimal totalCredit = 0;
            
                var journalId = Guid.NewGuid();
            
                var journal = new Journal
                {
                    Id = journalId,
                    BatchNumber = payment.BatchNumber,
                    TransactionSource = "AR",
                    BatchDate = payment.PaymentDate,
                    BatchDescription = $"Posting payments {payment.BatchNumber} for customer {payment.CustomerName}",
                    IsPosted = true,
                    TotalCredit = totalCredit,
                    TotalDebit = payment.AmountToPay,
                    TenantId = payment.TenantId,
                };
                foreach (var invoice in invoices)
                {
                    if (remainingAmountToPay <= 0) break;

                    decimal paymentBuyRate = payment.BuyRate > 0 ? payment.BuyRate : 1;
                    decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;
                    decimal customerBuyingRate =customer?.BuyingRate ?? 1;
                    // 🔹 Convert payment to invoice currency
                    decimal convertedAmount = remainingAmountToPay * (paymentBuyRate / invoiceBuyRate);
                    
                    var amountToAllocate = Math.Min(invoice.Balance, convertedAmount);
                    
                    decimal customerCurrencyAmount = amountToAllocate * (invoiceBuyRate / customerBuyingRate);
                    decimal usedPaymentCurrency = amountToAllocate * (invoiceBuyRate / paymentBuyRate);

                    customer.Balance -= customerCurrencyAmount;
                    invoice.Balance -= amountToAllocate;
                    invoice.PaidAmount += amountToAllocate;
                    remainingAmountToPay -= usedPaymentCurrency;

                    if (invoice.Balance == 0)
                        invoice.Status = 2; 
                    else if (invoice.PaidAmount > 0)
                        invoice.Status = 1; 
                    else
                        invoice.Status = 0;

                    // Check for existing unposted record
                    var existingRecord = await _paymentRecordsRepository.FirstOrDefaultAsync(
                        r => r.PaymentId == payment.Id && r.InvoiceId == invoice.Id && !r.IsPosted);

                    if (existingRecord != null)
                    {
                        // Update it and mark as posted
                        existingRecord.Amount = payment.AmountToPay;
                        existingRecord.IsPosted = true;
                        await _paymentRecordsRepository.UpdateAsync(existingRecord);
                    }
                    else
                    {
                        // If no draft exists, insert new posted record
                        var paymentRecord = new ArInvoicePaymentRecords
                        {
                            PaymentId = payment.Id,
                            InvoiceId = invoice.Id,
                            Amount = payment.AmountToPay,
                            ConvertedAmount = amountToAllocate,
                            PaymentDate = payment.PaymentDate,
                            BankName = payment.BankName,
                            BankBranch = payment.BankBranch,
                            CurrencyName = payment.CurrencyName,
                            CurrencyCode = payment.CurrencyCode,
                            ModeOfPayment = payment.ModeOfPayment,
                            ChequeNo = payment.ChequeNumber,
                            CustomerName = payment.CustomerName,
                            InvoiceNo = invoice.InvoiceNumber,
                            IsPosted = true,
                        };
                        await _paymentRecordsRepository.InsertAsync(paymentRecord);
                    }

                    await _arInvoiceRepository.UpdateAsync(invoice);
                    await _repositoryCustomer.UpdateAsync(customer);
                
                    await _repositoryJournalDetails.InsertAsync(new JournalDetail
                    {
                        Id = Guid.NewGuid(),
                        JournalId = journalId,
                        AccountId = invoice.AccountId,
                        AccountName = invoice.AccountName,
                        OuId = payment.OuId,
                        OuName = payment.OuName,
                        ReferenceNumber = payment.ReferenceNo,
                        Description = $"A/R Payment - {payment.CustomerName} - Cheque No: {payment.ChequeNumber}",
                        DebitAmount = 0,
                        CreditAmount = amountToAllocate,
                        TransactionDate = payment.PaymentDate,
                        TransactionSource = "A/R Payment",
                        CurrencyId = payment.CurrencyId,
                        CurrencyName = payment.CurrencyName,
                        CurrencyCode = payment.CurrencyCode,
                        BuyRate = payment.BuyRate,
                        SellRate = payment.SellRate,
                        IsMultiCurrency = payment.IsMultiCurrency,
                        IsReconciled = false,
                        IsOpeningBalance = false,
                        IsConsolidated = false,
                        IsPosted = true,
                        BatchDate = payment.PaymentDate,
                        BatchNumber = payment.BatchNumber,
                    });
                
                    totalCredit += amountToAllocate;
                }
            
                await _repositoryJournalDetails.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = payment.BankAccountId,
                    AccountName = payment.BankAccountName,
                    OuId = payment.OuId,
                    OuName = payment.OuName,
                    ReferenceNumber = payment.ReferenceNo,
                    Description = $"A/R Payment - {payment.CustomerName} - {payment.PaymentDate:yyyy-MM-dd}",
                    DebitAmount = payment.AmountToPay,
                    CreditAmount = 0,
                    TransactionDate = payment.PaymentDate,
                    TransactionSource = "A/R Payment",
                    CurrencyId = payment.CurrencyId,
                    CurrencyName = payment.CurrencyName,
                    CurrencyCode = payment.CurrencyCode,
                    BuyRate = payment.BuyRate,
                    SellRate = payment.SellRate,
                    IsMultiCurrency = payment.IsMultiCurrency,
                    IsReconciled = false,
                    IsOpeningBalance = false,
                    IsConsolidated = false,
                    IsPosted = true,
                    BatchDate = payment.PaymentDate,
                    BatchNumber = payment.BatchNumber,
                });
            
                await _repositoryJournal.InsertAsync(journal);

                // Mark payment as posted
                payment.IsPosted = true;
                await _arPaymentRepository.UpdateAsync(payment);
            }
        }

        return new { code = 200, message = "Payments posted successfully." };
    }

    
    public async Task<object> CancelPayment(Guid Id)
    {
        var payment = await _arPaymentRepository.GetAsync(Id);
        if (payment == null)
            return new { code = 404, message = "Payment not found." };

        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == payment.CustomerId);
        var defaultCurrency = customer?.CurrencyName;

        // Load payment records to get actual allocated amounts per invoice
        var paymentRecords = await _paymentRecordsRepository.GetAllListAsync(x => x.PaymentId == Id);

        if (paymentRecords != null && paymentRecords.Any())
        {
            foreach (var record in paymentRecords)
            {
                var invoice = await _arInvoiceRepository.GetAsync(record.InvoiceId);
                if (invoice == null) continue;

                // Get actual amount applied to this invoice (already in invoice currency)
                decimal amountToReverse = record.ConvertedAmount;

                // Reverse invoice balances (in invoice currency)
                invoice.Balance += amountToReverse;
                invoice.PaidAmount -= amountToReverse;

                if (invoice.PaidAmount <= 0)
                    invoice.Status = 0; // unpaid
                else if (invoice.Balance == 0)
                    invoice.Status = 2; // fully paid
                else
                    invoice.Status = 1; // partially paid

                await _arInvoiceRepository.UpdateAsync(invoice);

                // Update customer balance (in customer currency)
                if (customer != null)
                {
                    decimal customerBuyingRate = customer?.BuyingRate ?? 1;
                    decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;

                    decimal customerCurrencyAmount = amountToReverse * (invoiceBuyRate / customerBuyingRate);
                    customer.Balance += customerCurrencyAmount;
                    await _repositoryCustomer.UpdateAsync(customer);
                }

                // Delete this payment record after reversal
                await _paymentRecordsRepository.DeleteAsync(record);
            }
        }

        // Mark payment as cancelled
        payment.IsCanceled = true;
        payment.CanceledDate = DateTime.Now;
        string canceledByName = "Unknown";
        if (_abpSession.UserId.HasValue)
        {
            var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
            canceledByName = user != null ? user.Name : "Unknown";
        }
        payment.CanceledBy = canceledByName;
        payment.IsPosted = false;
        await _arPaymentRepository.UpdateAsync(payment);

        // Delete journals linked to this payment
        var journals = await _repositoryJournal.GetAllListAsync(
            j => j.BatchNumber == payment.BatchNumber && j.TransactionSource == "AP");

        foreach (var journal in journals)
        {
            await _repositoryJournal.DeleteAsync(journal);
            var journalDetails = await _repositoryJournalDetails.GetAllListAsync(
                jd => jd.JournalId == journal.Id);
            foreach (var detail in journalDetails)
            {            await _repositoryJournalDetails.DeleteAsync(detail);
            }
        }

        return new { code = 200, message = "Payment cancelled successfully." };
    }
    
    public async Task<object> CancelPayment(List<Guid> paymentIds)
    {
        foreach (var paymentId in paymentIds)
        {
            await CancelPayment(paymentId);
        }
        return new { code = 200, message = "Payments cancelled successfully." };
    }
    
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "AR-PaymentBatchNumbers");
        
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "ARP" + rnd.Next(1000, 9999).ToString();
                bool exists = await _arPaymentRepository.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }
        string batchNumber;
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _arPaymentRepository.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;
            systemNumber.LastNo++;
        }
        systemNumber.LastNo++;

        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return batchNumber;
    }
    public async Task<object> ListAllPaymentRecords()
    {
        var paymentRecords = await _paymentRecordsRepository.GetAllListAsync();
        return paymentRecords;
    }
}