using Abp.Domain.Repositories;
using TopazERP.Models.Ap;
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

namespace TopazERP.DomainServices.Ap.ApPayments;

public class ApPaymentManager: Abp.Domain.Services.IDomainService, IApPaymentManager
{
    private readonly IRepository<ApInvoice, Guid> _apInvoiceRepository;
    private readonly IRepository<ApPayment, Guid> _apPaymentRepository;
    private readonly IRepository<Supplier, Guid> _repositorySupplier;
    private readonly IRepository<ApInvoicePaymentRecords, Guid> _paymentRecordsRepository;
    private readonly IRepository<CompanyProfile, Guid> _companyProfileRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<Currency, Guid> _repositoryCurrency;
    private readonly IRepository<ApInvoicePaymentRecords, Guid> _repositoryPaymentRecords;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;

    public ApPaymentManager(IRepository<ApPayment, Guid> apPaymentRepository, IRepository<ApInvoice, Guid> apInvoiceRepository, IRepository<Supplier, Guid> repositorySupplier, IRepository<ApInvoicePaymentRecords, Guid> paymentRecordsRepository, IRepository<CompanyProfile, Guid> companyProfileRepository, IRepository<Journal, Guid> repositoryJournal, IRepository<Currency, Guid> repositoryCurrency, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<ApInvoicePaymentRecords, Guid> repositoryPaymentRecords, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<User, long> userRepository, IAbpSession abpSession)
    {
        _apInvoiceRepository = apInvoiceRepository;
        _apPaymentRepository = apPaymentRepository;
        _repositorySupplier = repositorySupplier;
        _paymentRecordsRepository = paymentRecordsRepository;
        _companyProfileRepository = companyProfileRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryCurrency = repositoryCurrency;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositoryPaymentRecords = repositoryPaymentRecords;
        _repositorySystemNumber = repositorySystemNumber;
        _userRepository = userRepository;
        _abpSession = abpSession;
    }

    public async Task<object> ListAll()
    {
        var payments = await _apPaymentRepository.GetAllListAsync();
        return payments;
    }

    public async Task<object> ListAllPaymentRecords()
    {
        var payments = await _paymentRecordsRepository.GetAllListAsync();
        return payments;
    }

    public async Task<object> Create(ApPayment input)
    {
        input.SupplierName = input.SupplierName.Trim();
        //generate batch number if not provided
        if (string.IsNullOrWhiteSpace(input.BatchNumber) || input.BatchNumber.Trim() == "0")
        {
            input.BatchNumber = await GenerateBatchNumberAsync();
        }
        else
        {
            input.BatchNumber = input.BatchNumber.Trim();
        }
        var existingPayment = await _apPaymentRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new
            {
            
                code = 400,
                message = "Payment with the same batch number already exists."
            };
        }
        var companyProfile = await _companyProfileRepository.GetAll().FirstOrDefaultAsync();
        var invoices = await _apInvoiceRepository.GetAllListAsync(x => x.SupplierName == input.SupplierName);
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == input.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
            };
        }
    
        if (input.InvoiceList == null || !input.InvoiceList.Any())
        {
            return new
            {
                code = 400,
                message = "No invoices attached to the payment."
            };
        }
        if (!invoices.Any())
        {
            return new
            {
                code = 400,
                message = "No invoices available for payment."
            };
        }
        // Save the payment record
        var createdEntity = await _apPaymentRepository.InsertAsync(input);
        
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

            var paymentRecord = new ApInvoicePaymentRecords
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
                SupplierName = input.SupplierName,
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
            message = "Payment created and distributed successfully."
        };
    }
    
    public async Task Update(ApPayment input)
    {
        await _apPaymentRepository.UpdateAsync(input);
        // Remove old unposted records for this payment (to avoid duplicates)
        var existingRecords = await _paymentRecordsRepository.GetAllListAsync(x => x.PaymentId == input.Id && !x.IsPosted);
        foreach (var record in existingRecords)
        {
            await _paymentRecordsRepository.DeleteAsync(record);
        }
        var invoices = await _apInvoiceRepository.GetAllListAsync(x => x.SupplierName == input.SupplierName);
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == input.SupplierId);
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

            var paymentRecord = new ApInvoicePaymentRecords
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
                SupplierName = input.SupplierName,
                InvoiceNo = invoice.InvoiceNumber,
                IsPosted = false,
            };
            await _paymentRecordsRepository.InsertAsync(paymentRecord);
            remainingAmountToPay -= usedPaymentCurrency;
        }
    }
    
    public async Task<ApInvoice> GetAsync(string SupplierName)
    {
        return await _apInvoiceRepository.FirstOrDefaultAsync(x => x.SupplierName == SupplierName);
    }
    
    public async Task<object> Delete(Guid Id)
    {
        await _apPaymentRepository.DeleteAsync(Id);
        return new { code = 200, message = "Payment deleted successfully." };
    }
    
    public async Task<object> PostPayments(List<Guid> paymentIds)
    {
        foreach (var paymentId in paymentIds)
        {
            var payment = await _apPaymentRepository.GetAsync(paymentId);

            if (payment == null)
            {
                continue;
            }

            if (!payment.IsPosted)
            {
                var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == payment.SupplierId);
           
                var invoices = await _apInvoiceRepository.GetAll()
                    .Where(x => payment.InvoiceList.Select(i => i.Id).Contains(x.Id) && x.IsPosted)
                    .OrderBy(x => x.ProjectedPayDate)
                    .ToListAsync();

                if (!invoices.Any())
                {
                    return new { code = 400, message = "No invoices available for posting." };
                }

                decimal remainingAmountToPay = payment.AmountToPay;
                decimal totalDebit = 0;
                // Create Journal Entry
                var journalId = Guid.NewGuid();
                
                var journal = new Journal
                {
                    Id = journalId,
                    BatchNumber = payment.BatchNumber,
                    TransactionSource = "AP",
                    BatchDate = payment.PaymentDate,
                    BatchDescription = $"Posting payments {payment.BatchNumber} for supplier {payment.SupplierName}",
                    IsPosted = true,
                    TotalCredit = payment.AmountToPay,
                    TotalDebit = totalDebit,
                    TenantId = payment.TenantId,
                };
                
                foreach (var invoice in invoices)
                {
                    if (remainingAmountToPay <= 0) break;
                    // default currency is Ghana Cedi
                    
                    decimal paymentBuyRate = payment.BuyRate > 0 ? payment.BuyRate : 1;
                    decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;
                    decimal supplierBuyingRate = supplier?.buyingRate ?? 1;
                    
                    // Convert payment to invoice currency
                    decimal convertedAmount = remainingAmountToPay * (paymentBuyRate / invoiceBuyRate);

                    var amountToAllocate = Math.Min(invoice.Balance, convertedAmount);
                    // Convert the amount allocated (invoice currency) into supplier's currency

                    decimal supplierCurrencyAmount = amountToAllocate * (invoiceBuyRate / supplierBuyingRate);
                    decimal usedPaymentCurrency = amountToAllocate * (invoiceBuyRate / paymentBuyRate);

                    if (supplier != null)
                    {
                        supplier.Balance -= supplierCurrencyAmount;
                        invoice.Balance -= amountToAllocate;
                        invoice.PaidAmount += amountToAllocate;
                        remainingAmountToPay -= usedPaymentCurrency;

                        if (invoice.Balance == 0)
                            invoice.Status = 2;
                        else if (invoice.PaidAmount > 0)
                            invoice.Status = 1;
                        else
                            invoice.Status = 0;

                        var existingRecord = await _paymentRecordsRepository.FirstOrDefaultAsync(r =>
                            r.PaymentId == payment.Id && r.InvoiceId == invoice.Id && !r.IsPosted);

                        if (existingRecord != null)
                        {
                            // Update it and mark as posted
                            existingRecord.Amount = payment.AmountToPay;
                            existingRecord.IsPosted = true;
                            await _paymentRecordsRepository.UpdateAsync(existingRecord);
                        }
                        else
                        {
                            var paymentRecord = new ApInvoicePaymentRecords
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
                                SupplierName = payment.SupplierName,
                                InvoiceNo = invoice.InvoiceNumber,
                                IsPosted = true,
                            };
                            await _paymentRecordsRepository.InsertAsync(paymentRecord);
                        }

                        await _apInvoiceRepository.UpdateAsync(invoice);
                        await _repositorySupplier.UpdateAsync(supplier);
                    }

                    await _repositoryJournalDetail.InsertAsync(new JournalDetail
                    {
                        Id = Guid.NewGuid(),
                        JournalId = journalId,
                        AccountId = invoice.LiabilityAccountId,
                        AccountName = invoice.LiabilityAccountName,
                        OuId = payment.OuId,
                        OuName = payment.OuName,
                        ReferenceNumber = payment.ReferenceNumber,
                        Description = $"A/P Payment - {payment.SupplierName} - Cheque No: {payment.ChequeNumber}",
                        DebitAmount = amountToAllocate,
                        CreditAmount = 0,
                        TransactionDate = payment.PaymentDate,
                        TransactionSource = "A/P Payment",
                        CurrencyId = payment.CurrencyId,
                        CurrencyName = payment.CurrencyName,
                        CurrencyCode = payment.CurrencyCode,
                        BuyRate = payment.BuyRate,
                        SellRate = payment.SellRate,
                        IsMultiCurrency = payment.IsMultiCurrency,
                        IsReconciled = false,
                        IsOpeningBalance = false,
                        IsConsolidated = false,
                        BatchDate = payment.PaymentDate,
                        BatchNumber =  payment.BatchNumber,
                        IsPosted = true
                        
                    });
                     
                    totalDebit += amountToAllocate;
                }
                
                
                await _repositoryJournalDetail.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = payment.BankAccountId,
                    AccountName = payment.BankAccountName,
                    OuId = payment.OuId,
                    OuName = payment.OuName,
                    ReferenceNumber = payment.ReferenceNumber,
                    Description = $"A/P Payment - {payment.SupplierName} - {payment.PaymentDate:yyyy-MM-dd}",
                    DebitAmount = 0,
                    CreditAmount = payment.AmountToPay,
                    TransactionDate = payment.PaymentDate,
                    TransactionSource = "A/P Payment",
                    CurrencyId = payment.CurrencyId,
                    CurrencyName = payment.CurrencyName,
                    CurrencyCode = payment.CurrencyCode,
                    BuyRate = payment.BuyRate,
                    SellRate = payment.SellRate,
                    IsMultiCurrency = payment.IsMultiCurrency,
                    IsReconciled = false,
                    IsOpeningBalance = false,
                    IsConsolidated = false,
                    BatchDate = payment.PaymentDate,
                    BatchNumber =  payment.BatchNumber,
                    IsPosted = true
                        
                });
                
                await _repositoryJournal.InsertAsync(journal);

                // Mark payment as posted
                payment.IsPosted = true;
                await _apPaymentRepository.UpdateAsync(payment);
            }
        }

        return new { code = 200, message = "Payments posted successfully." };
    }

    public async Task<object> CancelPayment(Guid Id)
    {
        var payment = await _apPaymentRepository.GetAsync(Id);
        if (payment == null)
            return new { code = 404, message = "Payment not found." };

        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == payment.SupplierId);
        var defaultCurrency = supplier?.CurrencyName;

        // 🔹 Load payment records to get actual allocated amounts per invoice
        var paymentRecords = await _paymentRecordsRepository.GetAllListAsync(x => x.PaymentId == Id);

        if (paymentRecords != null && paymentRecords.Any())
        {
            foreach (var record in paymentRecords)
            {
                var invoice = await _apInvoiceRepository.GetAsync(record.InvoiceId);
                if (invoice == null) continue;

                // Get actual amount applied to this invoice (already in invoice currency)
                decimal amountToReverse = record.ConvertedAmount;

                // 🔹 Reverse invoice balances (in invoice currency)
                invoice.Balance += amountToReverse;
                invoice.PaidAmount -= amountToReverse;

                if (invoice.PaidAmount <= 0)
                    invoice.Status = 0; // unpaid
                else if (invoice.Balance == 0)
                    invoice.Status = 2; // fully paid
                else
                    invoice.Status = 1; // partially paid

                await _apInvoiceRepository.UpdateAsync(invoice);

                //  Update supplier balance (convert to supplier currency)
                if (supplier != null)
                {
                    decimal supplierBuyingRate = supplier?.buyingRate ?? 1;
                    decimal invoiceBuyRate = invoice.BuyRate > 0 ? invoice.BuyRate : 1;

                    decimal supplierCurrencyAmount = amountToReverse * (invoiceBuyRate / supplierBuyingRate);
                    supplier.Balance += supplierCurrencyAmount;
                    await _repositorySupplier.UpdateAsync(supplier);
                }

                //  Delete this payment record after reversal
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
        await _apPaymentRepository.UpdateAsync(payment);

        // Delete journals linked to this payment
        var journals = await _repositoryJournal.GetAllListAsync(
            j => j.BatchNumber == payment.BatchNumber && j.TransactionSource == "AP");

        foreach (var journal in journals)
        {
            await _repositoryJournal.DeleteAsync(journal);
            // delete each journal detail
            var journalDetails = await _repositoryJournalDetail.GetAllListAsync(
                jd => jd.JournalId == journal.Id);
            foreach (var detail in journalDetails)
            {            await _repositoryJournalDetail.DeleteAsync(detail);
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
            .FirstOrDefault(sn => sn.ItemName == "AP-PaymentBatchNumbers");
        
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "APP" + rnd.Next(1000, 9999).ToString();
                bool exists = await _apPaymentRepository.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }
        string batchNumber;
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _apPaymentRepository.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;
            systemNumber.LastNo++;
        }
        systemNumber.LastNo++;

        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return batchNumber;
    }
}
