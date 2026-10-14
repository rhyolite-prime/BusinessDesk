using Abp.Domain.Repositories;
using TopazERP.DomainServices.Ap.ApInvoices.Dto;
using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Runtime.Session;
using TopazERP.Authorization.Users;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ap.ApInvoices;

public class ApInvoiceManager: Abp.Domain.Services.DomainService, IApInvoiceManager
{
    private readonly IRepository<ApInvoice, Guid> _repositoryApInvoice;
    private readonly IRepository<Supplier, Guid> _repositorySupplier;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;

    public ApInvoiceManager(IRepository<ApInvoice, Guid> repositoryApInvoice, IRepository<Supplier, Guid> repositorySupplier, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail, IAbpSession abpSession, IRepository<User, long> userRepository)
    {
        _repositoryApInvoice = repositoryApInvoice;
        _repositorySupplier = repositorySupplier;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _abpSession = abpSession;
        _userRepository = userRepository;
    }
   
       
   
    public async Task<object> Create(ApInvoice entity)
    {
        entity.SupplierName = entity.SupplierName.Trim();
        //generate invoice number if not provided
        if (string.IsNullOrWhiteSpace(entity.InvoiceNumber) || entity.InvoiceNumber.Trim() == "0")
        {
            entity.InvoiceNumber = await GenerateInvoiceNumberAsync();
        }
        else
        {
            entity.InvoiceNumber = entity.InvoiceNumber.Trim();
        }
        //generate batch number if not provided
        if (string.IsNullOrWhiteSpace(entity.BatchNumber) || entity.BatchNumber.Trim() == "0")
        {
            entity.BatchNumber = await GenerateBatchNumberAsync();
        }
        else
        {
            entity.BatchNumber = entity.BatchNumber.Trim();
        }
        var existingInvoice = await _repositoryApInvoice.FirstOrDefaultAsync(x => x.InvoiceNumber.Trim().ToLower() == entity.InvoiceNumber.Trim().ToLower());
        if (existingInvoice != null)
        {
            return new
            {
                code = 400,
                message = "Invoice number is already used. Please use a different number."
            };
        }

        // Validate supplier
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == entity.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
            };
        }
    
        var invoiceNumber = await _repositoryApInvoice.FirstOrDefaultAsync(x => x.InvoiceNumber == entity.InvoiceNumber);
        if (invoiceNumber != null)
        {
            entity.InvoiceNumber = await GenerateInvoiceNumberAsync();
        }
   
   
        var createdInvoice = await _repositoryApInvoice.InsertAsync(entity);

        return new
        {
            id = createdInvoice.Id,
            code = 200,
            message = "Invoice created successfully."
        };
    }
    public async Task<object> Update(ApInvoice input)
    {
        await _repositoryApInvoice.UpdateAsync(input);
        return new
        {
        code = 200,
        message = "Invoice and details updated successfully."
        };
    }
    private async Task CreateOrUpdateJournalAsync(ApInvoice invoice, bool isEdit)
    {
        decimal totalDebit = 0;
        decimal totalCredit = 0;

        var existingJournal = await _repositoryJournal.FirstOrDefaultAsync(
            j => j.BatchNumber == invoice.BatchNumber && j.TransactionSource == "AP");
        Journal journal;

        if (isEdit && existingJournal != null)
        {
            // 🔹 DELETE OLD DETAILS
            var oldDetails = await _repositoryJournalDetail
                .GetAllListAsync(d => d.JournalId == existingJournal.Id);

            foreach (var old in oldDetails)
            {
                await _repositoryJournalDetail.DeleteAsync(old);
            }

            journal = existingJournal;
        }
        else
        {
            journal = new Journal
            {
                Id = Guid.NewGuid(),
                BatchNumber = invoice.BatchNumber,
                TransactionSource = "AP",
                BatchDate = invoice.InvoiceDate,
                TenantId = invoice.TenantId
            };
        }
        // DEBIT ENTRIES
        foreach (var detail in invoice.InvoiceDetails)
        {
            var debit = new JournalDetail
            {
                Id = Guid.NewGuid(),
                JournalId = journal.Id,
                AccountId = detail.DebitAccountId,
                AccountName = detail.DebitAccountName,
                OuId = invoice.OuId,
                OuName = invoice.OuName,
                ReferenceNumber = detail.ReferenceNumber,
                Description = $"A/P invoice - {invoice.InvoiceNumber} - {invoice.SupplierName} - {detail.Description}" + (isEdit ? " (Edited)" : ""),
                DebitAmount = detail.SubTotal,
                CreditAmount = 0,
                TransactionDate = invoice.InvoiceDate,
                TransactionSource = "A/P Details",
                CurrencyId = invoice.CurrencyId,
                CurrencyName = invoice.CurrencyName,
                CurrencyCode = invoice.CurrencyCode,
                BuyRate = invoice.BuyRate,
                SellRate = invoice.SellRate,
                IsMultiCurrency = invoice.IsMultiCurrency,
                BatchDate = invoice.InvoiceDate,
                BatchNumber = invoice.BatchNumber,
                IsPosted = true
            };

            await _repositoryJournalDetail.InsertAsync(debit);
            totalDebit += detail.SubTotal;
        }
        // CREDIT ENTRY
        var credit = new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journal.Id,
            AccountId = invoice.LiabilityAccountId,
            AccountName = invoice.LiabilityAccountName,
            OuId = invoice.OuId,
            OuName = invoice.OuName,
            ReferenceNumber = invoice.InvoiceNumber,
            Description = $"A/P invoice - {invoice.InvoiceNumber} - {invoice.SupplierName}" + (isEdit ? " (Edited)" : ""),
            DebitAmount = 0,
            CreditAmount = invoice.TotalInvoiceAmount,
            TransactionDate = invoice.InvoiceDate,
            TransactionSource = "A/P Header",
            CurrencyId = invoice.CurrencyId,
            CurrencyName = invoice.CurrencyName,
            CurrencyCode = invoice.CurrencyCode,
            BuyRate = invoice.BuyRate,
            SellRate = invoice.SellRate,
            IsMultiCurrency = invoice.IsMultiCurrency,
            BatchDate = invoice.InvoiceDate,
            BatchNumber = invoice.BatchNumber,
            IsPosted = true
        };

        await _repositoryJournalDetail.InsertAsync(credit);
        totalCredit += invoice.TotalInvoiceAmount;

        // FINALIZE JOURNAL
        journal.BatchDate = invoice.InvoiceDate;
        journal.BatchDescription = isEdit
            ? $"Reposting invoice {invoice.InvoiceNumber} after edit"
            : $"Posting invoice {invoice.InvoiceNumber} for supplier {invoice.SupplierName}";
        journal.IsPosted = true;
        journal.TotalDebit = totalDebit;
        journal.TotalCredit = totalCredit;
        journal.TenantId = invoice.TenantId;

        if (existingJournal == null)
            await _repositoryJournal.InsertAsync(journal);
        else
            await _repositoryJournal.UpdateAsync(journal);
    }
    
    public async Task<object> EditPostedInvoice(ApInvoice input)
    {
        var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == input.SupplierId);
        if (supplier == null)
        {
            return new
            {
                code = 404,
                message = "Supplier not found."
            };
        }
        var convertedBalance = (supplier.buyingRate == input.BuyRate)
            ? input.Balance / input.BuyRate
            : input.Balance * input.BuyRate;
            
        supplier.Balance = convertedBalance;
        await _repositorySupplier.UpdateAsync(supplier);

   
        await _repositoryApInvoice.UpdateAsync(input);
    
        await CreateOrUpdateJournalAsync(input, true);

    

        return new { code = 200, message = "Invoice and supplier balance updated successfully." };
    }


    public async Task<object> ListAll()
    {
        var data = await _repositoryApInvoice.GetAllListAsync();
        return data.OrderBy(item => item.SupplierName).ToList();
    }
    public async Task<ApInvoice> GetAsync(string supplierName)
    {
        return await _repositoryApInvoice.FirstOrDefaultAsync(x => x.SupplierName.Trim().ToLower() == supplierName.Trim().ToLower());
    }
  
    private decimal CalculateTotalTax(decimal amount, List<InvoiceTaxLevies> taxLevies)
    {
        if (taxLevies == null || !taxLevies.Any())
            return 0;
        return taxLevies.Sum(tax => amount * (tax.Rate / 100));
    }
    private decimal CalculateVat(decimal totalBeforeVat, decimal vatRate)
    {
        return vatRate > 0 ? totalBeforeVat * (vatRate / 100) : 0;
    }
    public async Task<object> PostInvoice(List<Guid> invoiceIds)
    {
        if (!invoiceIds.Any())
        {
            return new
            {
                code = 400,
                message = "No invoice selected."
            };
        }
        var selectedInvoices = await _repositoryApInvoice.GetAllListAsync(x => invoiceIds.Contains(x.Id));
        if (!selectedInvoices.Any())
        {
            return new
            {
                code = 404,
                message = "Invoices not found."
            };
        }
        foreach (var invoice in selectedInvoices)
        {
            //update supplier balance based on each invoice
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == invoice.SupplierId);
            if (supplier == null)
            {
                return new
                {
                    code = 404,
                    message = "Supplier not found."
                };
            }
            var convertedBalance = (supplier.buyingRate == invoice.BuyRate)
                ? invoice.Balance / invoice.BuyRate
                : invoice.Balance * invoice.BuyRate;
            
            supplier.Balance += convertedBalance;
            await _repositorySupplier.UpdateAsync(supplier);
            // Mark the invoice as posted
            invoice.IsPosted = true;
            await _repositoryApInvoice.UpdateAsync(invoice);
        
            // Create Journal Entry
            decimal totalDebit = 0;
            decimal totalCredit = 0;
            
            var journalId = Guid.NewGuid();
            
            var journal = new Journal
            {
                Id = journalId,
                BatchNumber = invoice.BatchNumber,
                TransactionSource = "AP",
                BatchDate = invoice.InvoiceDate,
                BatchDescription = $"Posting invoice {invoice.InvoiceNumber} for supplier {invoice.SupplierName}",
                IsPosted = true,
                TotalCredit = totalCredit,
                TotalDebit = totalDebit,
                TenantId = invoice.TenantId,
                //JournalDetails = new List<JournalDetail>()
            };
            // DEBIT SIDE – Each invoice detail contributes as an expense
            foreach (var detail in invoice.InvoiceDetails)
            {

                await _repositoryJournalDetail.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = detail.DebitAccountId,
                    AccountName = detail.DebitAccountName,
                    OuId = invoice.OuId,
                    OuName = invoice.OuName,
                    ReferenceNumber = detail.ReferenceNumber,
                    Description = $"A/P invoice - {invoice.InvoiceNumber} - {invoice.SupplierName} - {detail.Description}",
                    DebitAmount = detail.SubTotal,
                    CreditAmount = 0,
                    TransactionDate = invoice.InvoiceDate,
                    TransactionSource = "A/P Details",
                    CurrencyId = invoice.CurrencyId,
                    CurrencyName = invoice.CurrencyName,
                    CurrencyCode = invoice.CurrencyCode,
                    BuyRate = invoice.BuyRate,
                    SellRate = invoice.SellRate,
                    IsMultiCurrency = invoice.IsMultiCurrency,
                    IsReconciled = false,
                    IsOpeningBalance = false,
                    IsConsolidated = false,
                    BatchDate = invoice.InvoiceDate,
                    BatchNumber =  invoice.BatchNumber,
                    IsPosted = true
                    
                });
                
                totalDebit += detail.SubTotal;
                 
            }

            // CREDIT SIDE – Liability account entry (whole invoice amount)
            
            await _repositoryJournalDetail.InsertAsync(new JournalDetail
            {
                Id = Guid.NewGuid(),
                JournalId = journalId,
                AccountId = invoice.LiabilityAccountId,
                AccountName = invoice.LiabilityAccountName,
                OuId = invoice.OuId,
                OuName = invoice.OuName,
                ReferenceNumber = "",
                Description = $"A/P invoice-{invoice.InvoiceNumber}-{invoice.SupplierName}",
                DebitAmount = 0,
                CreditAmount = invoice.TotalInvoiceAmount,
                TransactionDate = invoice.InvoiceDate,
                TransactionSource = "A/P Header",
                CurrencyId = invoice.CurrencyId,
                CurrencyName = invoice.CurrencyName,
                CurrencyCode = invoice.CurrencyCode,
                BuyRate = invoice.BuyRate,
                SellRate = invoice.SellRate,
                IsMultiCurrency = invoice.IsMultiCurrency,
                IsReconciled = false,
                IsOpeningBalance = false,
                IsConsolidated = false,
                BatchDate = invoice.InvoiceDate,
                BatchNumber =  invoice.BatchNumber,
                IsPosted = true
                    
            });

            totalCredit += invoice.TotalInvoiceAmount;

            // Final totals
            journal.TotalDebit = totalDebit;
            journal.TotalCredit = totalCredit;
            await _repositoryJournal.InsertAsync(journal);
        }
        return new
        {
            code = 200,
            message = "Invoice(s) posted successfully."
        };
    }
    public async Task<object> CancelInvoice(List<Guid> invoiceIds)
    {
        if (!invoiceIds.Any())
        {
            return new
            {
                code = 400,
                message = "No invoice selected."
            };
        }
        var selectedInvoices = await _repositoryApInvoice.GetAllListAsync(x => invoiceIds.Contains(x.Id));
        if (!selectedInvoices.Any())
        {
            return new
            {
                code = 404,
                message = "Invoices not found."
            };
        }
        foreach (var invoice in selectedInvoices)
        {
            if (invoice.IsPosted)
            {
                var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => x.Id == invoice.SupplierId);
                if (supplier == null)
                {
                    return new
                    {
                        code = 404,
                        message = "Supplier not found."
                    };
                }
                var convertedBalance = (supplier.buyingRate == invoice.BuyRate)
                    ? invoice.Balance / invoice.BuyRate
                    : invoice.Balance * invoice.BuyRate;

                supplier.Balance -= convertedBalance;
                await _repositorySupplier.UpdateAsync(supplier);
                invoice.IsPosted = false;
                //  Remove from journal when invoice was posted
                var existingJournal = await _repositoryJournal.FirstOrDefaultAsync(
                    j => j.BatchNumber == invoice.BatchNumber && j.TransactionSource == "AP");
                if (existingJournal != null)
                {
                    await _repositoryJournal.DeleteAsync(existingJournal);
                }
                // remove from journal details
                var journalDetails = await _repositoryJournalDetail.GetAllListAsync(
                    jd => jd.JournalId == existingJournal.Id);
                foreach (var detail in journalDetails)
                {
                    await _repositoryJournalDetail.DeleteAsync(detail);
                }
            }
            invoice.IsCanceled = true;
            invoice.CanceledDate = DateTime.Now;
            string canceledByName = "Unknown";
            if (_abpSession.UserId.HasValue)
            {
                var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
                canceledByName = user != null ? user.Name : "Unknown";
            }
            invoice.CanceledBy = canceledByName;
            await _repositoryApInvoice.UpdateAsync(invoice);
        }
        return new
        {
            code = 200,
            message = "Invoice(s) cancelled successfully."
        };
    }
    //approve invoice
    public async Task<object> ApproveInvoice(List<Guid> invoiceIds)
    {
        if (!invoiceIds.Any())
        {
            return new
            {
                code = 400,
                message = "No invoice selected."
            };
        }
        var selectedInvoices = await _repositoryApInvoice.GetAllListAsync(x => invoiceIds.Contains(x.Id));
        if (!selectedInvoices.Any())
        {
            return new
            {
                code = 404,
                message = "Invoices not found."
            };
        }
        foreach (var invoice in selectedInvoices)
        {
            // Mark the invoice as approved
            invoice.IsApproved = true;
            await _repositoryApInvoice.UpdateAsync(invoice);
        }       
        return new
        {
            code = 200,
            message = "Invoice(s) approved successfully."
        };
    }
    
    public async Task<string> GenerateInvoiceNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers.FirstOrDefault(sn => sn.ItemName == "ApInvoiceNumbers");

        if (systemNumber == null)
        {
            return "1000";
        }

        string invoiceNumber;
        bool isDuplicate;

        do
        {
            invoiceNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";
            
            isDuplicate = await _repositoryApInvoice.CountAsync(x => x.InvoiceNumber == invoiceNumber) > 0;

            if (isDuplicate)
            {
                systemNumber.LastNo += 1;
            }
        } while (isDuplicate);

        // Update the system number in the database
        systemNumber.LastNo += 1;
        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return invoiceNumber;
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "ApInvoiceBatchNumbers");

        // If no system number exists, generate a random batch number as fallback
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "AP" + rnd.Next(1000, 9999).ToString();
                bool exists = await _repositoryApInvoice.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }
        string batchNumber;
        // Generate the next available batch number
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _repositoryApInvoice.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++; // ONLY increment here if the number exists
        }
        // Increment ONCE after choosing the batch number
        systemNumber.LastNo++;
        await _repositorySystemNumber.UpdateAsync(systemNumber);
        return batchNumber;
    }
    // get invoice by id
    public async Task<ApInvoice> GetById(Guid id)
    {
        var invoice = await _repositoryApInvoice.FirstOrDefaultAsync(x => x.Id == id);
        return invoice;
    }
}