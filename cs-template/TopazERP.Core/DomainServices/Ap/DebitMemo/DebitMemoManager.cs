using Abp.Domain.Repositories;
using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;
namespace TopazERP.DomainServices.Ap.DebitMemo;

public class DebitMemoManager: Abp.Domain.Services.DomainService, IDebitMemoManager
{
    private readonly IRepository<ApDebitMemo, Guid> _apDebitMemoRepository;
    private readonly IRepository<ApInvoice, Guid> _apInvoiceRepository;
    private readonly IRepository<Supplier, Guid> _supplierRepository;
    private readonly IRepository<ApInvoicePaymentRecords, Guid> _paymentRecordsRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    
    public DebitMemoManager(IRepository<ApDebitMemo, Guid> apDebitMemoRepository, IRepository<Supplier, Guid> supplierRepository, IRepository<ApInvoice, Guid> apInvoiceRepository, IRepository<ApInvoicePaymentRecords, Guid> paymentRecordsRepository, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<SystemNumber, Guid> repositorySystemNumber)
    {
        _apDebitMemoRepository = apDebitMemoRepository;
        _apInvoiceRepository = apInvoiceRepository;
        _paymentRecordsRepository = paymentRecordsRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositorySystemNumber = repositorySystemNumber;
        _supplierRepository = supplierRepository;
    }
    
    public async Task<object> ListAll()
    {
        var debitMemos = await _apDebitMemoRepository.GetAllListAsync();
        return debitMemos.OrderBy(item => item.SupplierName).ToList();
    }

    public async Task<object> Create(ApDebitMemo input)
    {
        // Validate the supplier exists
        var supplier = await _supplierRepository.FirstOrDefaultAsync(input.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
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
        var existingPayment = await _apDebitMemoRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new
            {
            
                code = 400,
                message = "Payment with the same batch number already exists."
            };
        }
        if (input.Amount == 0)
        {
            return new
            {
                code = 400,
                message = "Debit Memo amount cannot be zero."
            };
        }

        // Skip all invoice and balance logic — just insert the memo
        await _apDebitMemoRepository.InsertAsync(input);

        return new
        {
            code = 200,
            message = "Debit Memo created successfully.",
            data = new
            {
                DebitMemoId = input.Id,
            }
        };
    }

    
    public async Task<object> Apply(ApDebitMemo input)
    {
        decimal convertedAmount = 0m;
        var supplier = await _supplierRepository.FirstOrDefaultAsync(input.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
            };
        }

        // Retrieve the related invoice
        var invoice = await _apInvoiceRepository.FirstOrDefaultAsync(input.InvoiceId);
        convertedAmount = input.Amount * (input.BuyRate / invoice.BuyRate);
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
                message = "Debit memo amount exceeds the invoice balance."
            };
        }

        invoice.Balance -= convertedAmount;
        invoice.PaidAmount += convertedAmount;
        supplier.Balance -= convertedAmount;
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

        await _apInvoiceRepository.UpdateAsync(invoice);
        await _supplierRepository.UpdateAsync(supplier);
        
    /*else
    {
        convertedAmount = input.Amount * input.BuyRate / supplier.buyingRate;
        if (supplier.Balance < 0)
        {
            supplier.Balance += convertedAmount;
        }
        else
        {
            supplier.Balance -= convertedAmount;
        }

        await _supplierRepository.UpdateAsync(supplier);
    }*/
        var existingMemo = await _apDebitMemoRepository.FirstOrDefaultAsync(input.Id);
        if (existingMemo == null)
        {
            return new
            {
                code = 404,
                message = "Debit Memo not found."
            };
        }
   
        existingMemo.Amount = input.Amount;
        existingMemo.SupplierId = input.SupplierId;
        existingMemo.SupplierName = input.SupplierName;
        existingMemo.AccountNo = input.AccountNo;
        existingMemo.InvoiceId = input.InvoiceId;
        existingMemo.InvoiceNo = input.InvoiceNo;
        existingMemo.InvoiceBalance = input.InvoiceBalance;
        existingMemo.InvoiceCurrencyName = input.InvoiceCurrencyName;
        existingMemo.InvoiceBuyRate = input.InvoiceBuyRate;
        existingMemo.TransactionDate = input.TransactionDate;
        existingMemo.CurrencyId = input.CurrencyId;
        existingMemo.CurrencyName = input.CurrencyName;
        existingMemo.CurrencyCode = input.CurrencyCode;
        existingMemo.BuyRate = input.BuyRate;
        existingMemo.SellRate = input.SellRate;
        existingMemo.OuId = input.OuId;
        existingMemo.OuName = input.OuName;
        existingMemo.DebitGlId = input.DebitGlId;
        existingMemo.DebitGlName = input.DebitGlName;
        existingMemo.CreditGlId = input.CreditGlId;
        existingMemo.CreditGlName = input.CreditGlName;
        existingMemo.BankId = input.BankId;
        existingMemo.BankName = input.BankName;
        existingMemo.BankBranchId = input.BankBranchId;
        existingMemo.BankBranch = input.BankBranch;
        existingMemo.ChequeNo = input.ChequeNo;
        existingMemo.ChequeDate = input.ChequeDate;
        existingMemo.ModeOfPayment = input.ModeOfPayment;
        existingMemo.Description = input.Description;
        existingMemo.IsInvoiceDebit = input.IsInvoiceDebit;
        existingMemo.BatchNumber = input.BatchNumber;
        existingMemo.TenantId = input.TenantId;
        
        await _apDebitMemoRepository.UpdateAsync(existingMemo);
        
        var paymentRecord = new ApInvoicePaymentRecords
        {
            PaymentId = input.Id,
            InvoiceId = invoice.Id,
            Amount = input.Amount,
            ConvertedAmount = convertedAmount,
            PaymentDate = input.TransactionDate,
            BankName = input.BankName,
            BankBranch = input.BankBranch,
            CurrencyName = input.CurrencyName,
            CurrencyCode = input.CurrencyCode,
            ModeOfPayment = input.ModeOfPayment,
            ChequeNo = input.ChequeNo,
            SupplierName = input.SupplierName,
            InvoiceNo = invoice.InvoiceNumber,
            IsPosted = true,
            ReceiptNo = $"RCPT-{new Random().Next(1000, 9999)}"
        };

        await _paymentRecordsRepository.InsertAsync(paymentRecord);
        
        decimal totalDebit = 0;
        decimal totalCredit = 0;
        var journalId = Guid.NewGuid();
        var journal = new Journal
        {
            Id = journalId,
            BatchNumber = existingMemo.BatchNumber,
            TransactionSource = "AP",
            BatchDate = existingMemo.TransactionDate,
            BatchDescription = $"Debit Memo for supplier {invoice.SupplierName} - {existingMemo.Description}",
            IsPosted = true,
            TotalCredit = totalCredit,
            TotalDebit = totalDebit,
            TenantId = invoice.TenantId,
             
        };

        await _repositoryJournalDetail.InsertAsync(new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = invoice.LiabilityAccountId,
            AccountName = invoice.LiabilityAccountName,
            OuId = existingMemo.OuId,
            OuName = existingMemo.OuName,
            ReferenceNumber = invoice.InvoiceNumber,
            Description = $"A/P Memo - {existingMemo.SupplierName} - Cheque No: {existingMemo.ChequeNo} - {existingMemo.Description}",
            DebitAmount = existingMemo.Amount,
            CreditAmount = 0,
            TransactionDate = existingMemo.TransactionDate,
            TransactionSource = "A/P Debit Memo",
            CurrencyId = existingMemo.CurrencyId,
            CurrencyName =existingMemo.CurrencyName,
            CurrencyCode = existingMemo.CurrencyCode,
            BuyRate = existingMemo.BuyRate,
            SellRate = existingMemo.SellRate,
            IsMultiCurrency = false,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            BatchNumber = existingMemo.BatchNumber,
            BatchDate = existingMemo.TransactionDate,
            IsPosted = true
        });
        await _repositoryJournalDetail.InsertAsync(new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = existingMemo.CreditGlId,
            AccountName = existingMemo.CreditGlName,
            OuId = existingMemo.OuId,
            OuName = existingMemo.OuName,
            ReferenceNumber = invoice.InvoiceNumber,
            Description = $"A/P Memo - {existingMemo.SupplierName} - Cheque No: {existingMemo.ChequeNo} - {existingMemo.Description}",
            DebitAmount = 0,
            CreditAmount = existingMemo.Amount,
            TransactionDate = existingMemo.TransactionDate,
            TransactionSource = "A/P Debit Memo",
            CurrencyId = existingMemo.CurrencyId,
            CurrencyName = existingMemo.CurrencyName,
            CurrencyCode = existingMemo.CurrencyCode,
            BuyRate = existingMemo.BuyRate,
            SellRate = existingMemo.SellRate,
            IsMultiCurrency = false,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            BatchNumber = existingMemo.BatchNumber,
            BatchDate = existingMemo.TransactionDate,
            IsPosted = true
        });
        totalDebit += existingMemo.Amount;
        totalCredit += existingMemo.Amount;
        journal.TotalDebit = totalDebit;
        journal.TotalCredit = totalCredit;
        
        await _repositoryJournal.InsertAsync(journal);
        return new
        {
            code = 200,
            message = "Debit Memo Applied successfully.",
            data = new
            {
                DebitMemoId = input.Id,
            }
        };
    }
    
   public async Task<object> Update(ApDebitMemo input)
    {
        var existingMemo = await _apDebitMemoRepository.FirstOrDefaultAsync(input.Id);
        if (existingMemo == null)
        {
            return new
            {
                code = 404,
                message = "Debit Memo not found."
            };
        }
    
        existingMemo.SupplierId = input.SupplierId;
        existingMemo.SupplierName = input.SupplierName;
        existingMemo.AccountNo = input.AccountNo;
        existingMemo.InvoiceId = input.InvoiceId;
        existingMemo.InvoiceNo = input.InvoiceNo;
        existingMemo.InvoiceBalance = input.InvoiceBalance;
        existingMemo.InvoiceCurrencyName = input.InvoiceCurrencyName;
        existingMemo.InvoiceBuyRate = input.InvoiceBuyRate;
        existingMemo.Amount = input.Amount;
        existingMemo.TransactionDate = input.TransactionDate;
        existingMemo.CurrencyId = input.CurrencyId;
        existingMemo.CurrencyName = input.CurrencyName;
        existingMemo.CurrencyCode = input.CurrencyCode;
        existingMemo.BuyRate = input.BuyRate;
        existingMemo.SellRate = input.SellRate;
        existingMemo.OuId = input.OuId;
        existingMemo.OuName = input.OuName;
        existingMemo.DebitGlId = input.DebitGlId;
        existingMemo.DebitGlName = input.DebitGlName;
        existingMemo.CreditGlId = input.CreditGlId;
        existingMemo.CreditGlName = input.CreditGlName;
        existingMemo.BankId = input.BankId;
        existingMemo.BankName = input.BankName;
        existingMemo.BankBranchId = input.BankBranchId;
        existingMemo.BankBranch = input.BankBranch;
        existingMemo.ChequeNo = input.ChequeNo;
        existingMemo.ChequeDate = input.ChequeDate;
        existingMemo.ModeOfPayment = input.ModeOfPayment;
        existingMemo.Description = input.Description;
        existingMemo.IsInvoiceDebit = input.IsInvoiceDebit;
        existingMemo.BatchNumber = input.BatchNumber;
        existingMemo.TenantId = input.TenantId;

        await _apDebitMemoRepository.UpdateAsync(existingMemo);

        return new
        {
            code = 200,
            message = "Debit Memo updated successfully.",
            data = new
            {
                DebitMemoId = existingMemo.Id
            }
        };
    }
    public async Task<ApDebitMemo> GetAsync(string SupplierName)
    {
        return await _apDebitMemoRepository.FirstOrDefaultAsync(x => x.SupplierName == SupplierName);
    }
    
    public async Task<object> Delete(Guid id)
    {
        var memo = await _apDebitMemoRepository.FirstOrDefaultAsync(id);
        if (memo == null)
        {
            return new
            {
                code = 404,
                message = "Debit Memo not found."
            };
        }

        await _apDebitMemoRepository.DeleteAsync(memo);

        return new
        {
            code = 200,
            message = "Debit Memo deleted successfully."
        };
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "AP-MemoBatchNumbers");

        // If no system number exists, generate a random batch number as fallback
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "DM" + rnd.Next(1000, 9999).ToString();
                bool exists = await _apDebitMemoRepository.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }

        string batchNumber;

        // Generate the next available batch number
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _apDebitMemoRepository.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++; // ONLY increment here if the number exists
        }

        // Increment ONCE after choosing the batch number
        systemNumber.LastNo++;

        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return batchNumber;
    }

}