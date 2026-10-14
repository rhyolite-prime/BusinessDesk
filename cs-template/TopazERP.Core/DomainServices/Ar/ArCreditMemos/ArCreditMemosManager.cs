using Abp.Domain.Repositories;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;


namespace TopazERP.DomainServices.Ar.ArCreditMemos;

public class ArCreditMemosManager: Abp.Domain.Services.DomainService, IArCreditMemosManager
{
    private readonly IRepository<ArCreditMemo, Guid> _arCreditMemoRepository;
    private readonly IRepository<ArInvoice, Guid> _arInvoiceRepository;
    private readonly IRepository<Customer, Guid> _customerRepository;
    private readonly IRepository<ArInvoicePaymentRecords, Guid> _paymentRecordRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;

    public ArCreditMemosManager(IRepository<ArCreditMemo, Guid> arCreditMemoRepository,
        IRepository<ArInvoice, Guid> arInvoiceRepository, IRepository<Customer, Guid> customerRepository, IRepository<ArInvoicePaymentRecords, Guid> paymentRecordRepository, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<SystemNumber, Guid> repositorySystemNumber)
    {
        _arCreditMemoRepository = arCreditMemoRepository;
        _arInvoiceRepository = arInvoiceRepository;
        _customerRepository = customerRepository;
        _paymentRecordRepository = paymentRecordRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositorySystemNumber = repositorySystemNumber;
    }
    
    public async Task<object> ListAll()
    {
        var creditMemos = await _arCreditMemoRepository.GetAllListAsync();
        return creditMemos.OrderBy(item => item.CustomerName).ToList();
    }
    
    public async Task<object> Create(ArCreditMemo input)
    {
        var customer = await _customerRepository.FirstOrDefaultAsync(input.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 404,
                message = "Customer not found."
            };
        }
        
        if (string.IsNullOrWhiteSpace(input.BatchNumber) || input.BatchNumber.Trim() == "0")
        {
            input.BatchNumber = await GenerateBatchNumberAsync();
        }
        else
        {
            input.BatchNumber = input.BatchNumber.Trim();
        }
        var existingPayment = await _arCreditMemoRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new
            {
            
                code = 400,
                message = "Payment with the same batch number already exists."
            };
        }
        await _arCreditMemoRepository.InsertAsync(input);

        return new
        {
            code = 200,
            message = "Credit Memo created successfully.",
            data = new
            {
                CreditMemoId = input.Id,
            }
        };
    }

     public async Task<object> Apply(ArCreditMemo input)
     {
        var customer = await _customerRepository.FirstOrDefaultAsync(input.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 404,
                message = "Customer not found."
            };
        }
        
        var invoice = await _arInvoiceRepository.FirstOrDefaultAsync(input.InvoiceId);
            decimal convertedAmount = input.Amount * (input.BuyRate / invoice.BuyRate);
            // Ensure the invoice is not already fully paid
            if (invoice.Balance == 0)
            {
                return new
                {
                    code = 400,
                    message = "Invoice is already fully paid."
                };
            }
            if (convertedAmount > invoice.Balance)
            {
                return new
                {
                    code = 400,
                    message = "Credit Memo amount exceeds the invoice balance."
                };
            }
            // Reduce the invoice balance
            invoice.PaidAmount += convertedAmount;
            invoice.Balance -= convertedAmount;
            // Update the customer balance
            customer.Balance -= convertedAmount;
            // Update the invoice and customer in the repository
            if (convertedAmount >= invoice.Balance)
            {
                invoice.Status = 2; 
            }
            else if (convertedAmount > 0)
            {
                invoice.Status = 1; 
            }
            else
            {
                invoice.Status = 0; 
            }
            await _arInvoiceRepository.UpdateAsync(invoice);
            await _customerRepository.UpdateAsync(customer);
            
            //update payment record to reflect in statement
            var paymentRecord = new ArInvoicePaymentRecords
            {
                PaymentId = input.Id,
                InvoiceId = invoice.Id,
                Amount = input.Amount,
                ConvertedAmount = convertedAmount,
                PaymentDate = input.TransactionDate,
                BankName =input.BankName,
                BankBranch = input.BankBranch,
                CurrencyName = invoice.CurrencyName,
                CurrencyCode = invoice.currencyCode,
                ModeOfPayment = input.ModeOfPayment,
                ChequeNo = input.ChequeNo,
                CustomerName = input.CustomerName,
                InvoiceNo = invoice.InvoiceNumber,
                IsPosted = true,
                ReceiptNo = $"RCPT-{new Random().Next(1000, 9999)}"
            };
            
        await _paymentRecordRepository.InsertAsync(paymentRecord);
            
       
        await _arCreditMemoRepository.UpdateAsync(input);
        
        // Create a journal entry for the credit memo application
        decimal totalDebit = 0;
        decimal totalCredit = 0;

        var journalId = Guid.NewGuid();
        
        var journal = new Journal
        {
            Id = journalId,
            BatchNumber = input.BatchNumber,
            TransactionSource = "AR",
            BatchDate = input.TransactionDate,
            BatchDescription = $"Credit Memo for customer {invoice.CustomerName}",
            IsPosted = true,
            TotalCredit = totalCredit,
            TotalDebit = totalDebit,
            TenantId = invoice.TenantId,
        };

        await _repositoryJournalDetail.InsertAsync(new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = invoice.AccountId,
            AccountName = invoice.AccountName,
            OuId = input.OuId,
            OuName = input.OuName,
            ReferenceNumber = invoice.InvoiceNumber,
            Description = $"A/R Memo - {input.CustomerName} - Cheque No: {input.ChequeNo} - {input.Description}",
            DebitAmount = 0,
            CreditAmount = input.Amount,
            TransactionDate = input.TransactionDate,
            TransactionSource = "A/R Credit Memo",
            CurrencyId =input.CurrencyId,
            CurrencyName =input.CurrencyName,
            CurrencyCode = input.CurrencyCode,
            BuyRate = input.BuyRate,
            SellRate = input.SellRate,
            IsMultiCurrency = false,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            IsPosted = true,
            BatchNumber = input.BatchNumber,
            BatchDate = input.TransactionDate
            
        });
        
        await _repositoryJournalDetail.InsertAsync(new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = invoice.AccountId,
            AccountName = invoice.AccountName,
            OuId = input.OuId,
            OuName = input.OuName,
            ReferenceNumber = invoice.InvoiceNumber,
            Description = $"A/R Memo - {input.CustomerName} - Cheque No: {input.ChequeNo} - {input.Description}",
            DebitAmount = input.Amount,
            CreditAmount = 0,
            TransactionDate = input.TransactionDate,
            TransactionSource = "A/R Credit Memo",
            CurrencyId =input.CurrencyId,
            CurrencyName =input.CurrencyName,
            CurrencyCode = input.CurrencyCode,
            BuyRate = input.BuyRate,
            SellRate = input.SellRate,
            IsMultiCurrency = false,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            IsPosted = true,
            BatchNumber = input.BatchNumber,
            BatchDate = input.TransactionDate
        });
        
        totalDebit += input.Amount;
        totalCredit += input.Amount;
        journal.TotalDebit = totalDebit;
        journal.TotalCredit = totalCredit;
        
        await _repositoryJournal.InsertAsync(journal);

        return new
        {
            code = 200,
            message = "Credit Memo applied successfully.",
            data = new
            {
                CreditMemoId = input.Id,
            }
        };
    }
     
    public async Task<object> Update(ArCreditMemo input)
    {
        input.InvoiceNo = input.InvoiceNo?.Trim();

        var existingCreditMemo = await _arCreditMemoRepository.FirstOrDefaultAsync(input.Id);
        if (existingCreditMemo == null)
        {
            return new
            {
                code = 404,
                message = "Credit Memo not found."
            };
        }

        var customer = await _customerRepository.FirstOrDefaultAsync(input.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 404,
                message = "Customer not found."
            };
        }
      

        existingCreditMemo.Amount = input.Amount;
        existingCreditMemo.BuyRate = input.BuyRate;
        existingCreditMemo.InvoiceNo = input.InvoiceNo;
        existingCreditMemo.IsInvoiceDebit = input.IsInvoiceDebit;
        existingCreditMemo.TransactionDate = input.TransactionDate;
        existingCreditMemo.CustomerId = input.CustomerId;
        existingCreditMemo.CustomerName = input.CustomerName;
        existingCreditMemo.AccountNo = input.AccountNo;
        existingCreditMemo.InvoiceId = input.InvoiceId;
        existingCreditMemo.InvoiceBalance = input.InvoiceBalance;
        existingCreditMemo.InvoiceCurrencyName = input.InvoiceCurrencyName;
        existingCreditMemo.InvoiceBuyRate = input.InvoiceBuyRate;
        existingCreditMemo.CurrencyId = input.CurrencyId;
        existingCreditMemo.CurrencyName = input.CurrencyName;
        existingCreditMemo.CurrencyCode = input.CurrencyCode;
        existingCreditMemo.OuId = input.OuId;
        existingCreditMemo.OuName = input.OuName;
        existingCreditMemo.LiabilityGlId = input.LiabilityGlId;
        existingCreditMemo.LiabilityName = input.LiabilityName;
        existingCreditMemo.BankId = input.BankId;
        existingCreditMemo.BankName = input.BankName;
        existingCreditMemo.BankBranchId = input.BankBranchId;
        existingCreditMemo.BankBranch = input.BankBranch;
        existingCreditMemo.ChequeNo = input.ChequeNo;
        existingCreditMemo.ChequeDate = input.ChequeDate;
        existingCreditMemo.ModeOfPayment = input.ModeOfPayment;
        existingCreditMemo.Description = input.Description;
        existingCreditMemo.TenantId = input.TenantId;

        await _arCreditMemoRepository.UpdateAsync(existingCreditMemo);

        return new
        {
            code = 200,
            message = "Credit Memo updated successfully.",
            data = new
            {
                CreditMemoId = existingCreditMemo.Id,
            }
        };
    }
  
    public async Task<ArCreditMemo> GetAsync(string CustomerName)
    {
        return await _arCreditMemoRepository.FirstOrDefaultAsync(x => x.CustomerName == CustomerName);
    }
    
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "AR-MemoBatchNumbers");
        
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "CM" + rnd.Next(1000, 9999).ToString();
                bool exists = await _arCreditMemoRepository.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }
        string batchNumber;
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _arCreditMemoRepository.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;
            systemNumber.LastNo++;
        }
        systemNumber.LastNo++;

        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return batchNumber;
    }

    
    public async Task<object> Delete(Guid id)
    {
        var existingCreditMemo = await _arCreditMemoRepository.FirstOrDefaultAsync(id);
        if (existingCreditMemo == null)
        {
            return new
            {
                code = 404,
                message = "Credit Memo not found."
            };
        }

        await _arCreditMemoRepository.DeleteAsync(existingCreditMemo);

        return new
        {
            code = 200,
            message = "Credit Memo deleted successfully."
        };
    }

}