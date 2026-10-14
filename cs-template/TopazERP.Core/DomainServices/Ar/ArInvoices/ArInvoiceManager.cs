using Abp.Domain.Repositories;
using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Runtime.Session;
using Microsoft.EntityFrameworkCore;
using TopazERP.Authorization.Users;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ar.ArInvoices;

public class ArInvoiceManager: Abp.Domain.Services.DomainService, IArInvoiceManager
{
    private readonly IRepository<ArInvoice, Guid> _repositoryArInvoice;
    private readonly IRepository<Customer, Guid> _repositoryCustomer;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IRepository<Currency, Guid> _repositoryCurrency;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;
    
    public ArInvoiceManager(IRepository <ArInvoice, Guid> repositoryArInvoice, IRepository<Customer, Guid> repositoryCustomer, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<Journal, Guid> repositoryJournal, IRepository<Currency, Guid> repositoryCurrency, IRepository<JournalDetail, Guid> repositoryJournalDetail, IAbpSession abpSession, IRepository<User, long> userRepository)
    {
        _repositoryArInvoice = repositoryArInvoice;
        _repositoryCustomer = repositoryCustomer;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournal = repositoryJournal;
        _repositoryCurrency = repositoryCurrency;
        _repositoryJournalDetail = repositoryJournalDetail;
        _abpSession = abpSession;
        _userRepository = userRepository;
    }
    
    
     public async Task<object> Create(ArInvoice entity)
    {
        entity.CustomerName = entity.CustomerName.Trim();
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
        var existingInvoice = await _repositoryArInvoice.FirstOrDefaultAsync(x => x.InvoiceNumber.Trim().ToLower() == entity.InvoiceNumber.Trim().ToLower());
        if (existingInvoice != null)
        {
            return new
            {
                code = 400,
                message = "Invoice number is already used. Please use a different number."
            };
        }

        // Validate supplier
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == entity.CustomerId);
        if (customer == null)
        {
            return new
            {
                code = 404,
                message = "Customer not found."
            };
        }
    
        var invoiceNumber = await _repositoryArInvoice.FirstOrDefaultAsync(x => x.InvoiceNumber == entity.InvoiceNumber);
        if (invoiceNumber != null)
        {
            entity.InvoiceNumber = await GenerateInvoiceNumberAsync();
        }
   
   
        var createdInvoice = await _repositoryArInvoice.InsertAsync(entity);

        return new
        {
            id = createdInvoice.Id,
            code = 200,
            message = "Invoice created successfully."
        };
    }
    public async Task<object> Update(ArInvoice input)
    {
        await _repositoryArInvoice.UpdateAsync(input);

        return new
        {
            code = 200,
            message = "Invoice and details updated successfully."
        };
    }
    private async Task CreateOrUpdateJournalAsync(ArInvoice invoice, bool isEdit)
    {
        decimal totalDebit = 0;
        decimal totalCredit = 0;

        var existingJournal = await _repositoryJournal.FirstOrDefaultAsync(
            j => j.BatchNumber == invoice.BatchNumber && j.TransactionSource == "AR");

    
        Journal journal;

        if (isEdit && existingJournal != null)
        {
            // DELETE OLD DETAILS
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
                TransactionSource = "AR",
                BatchDate = invoice.InvoiceDate,
                TenantId = invoice.TenantId
            };
        }

        // DEBIT ENTRIES
        foreach (var detail in invoice.Details)
        {
            var debit = new JournalDetail
            {
                Id = Guid.NewGuid(),
                JournalId = journal.Id,
                AccountId = detail.CreditAccountId,
                AccountName = detail.CreditAccountName,
                OuId = invoice.OuId,
                OuName = invoice.OuName,
                ReferenceNumber = detail.ReferenceNo,
                Description = $"A/R invoice - {invoice.InvoiceNumber} - {invoice.CustomerName} - {detail.Description}" + (isEdit ? " (Edited)" : ""),
                DebitAmount = 0,
                CreditAmount = detail.SubTotal,
                TransactionDate = invoice.InvoiceDate,
                TransactionSource = "A/R Details",
                CurrencyId = invoice.CurrencyId,
                CurrencyName = invoice.CurrencyName,
                CurrencyCode = invoice.currencyCode,
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
            AccountId = invoice.AccountId,
            AccountName = invoice.AccountName,
            OuId = invoice.OuId,
            OuName = invoice.OuName,
            ReferenceNumber = invoice.InvoiceNumber,
            Description = $"A/R invoice - {invoice.InvoiceNumber} - {invoice.CustomerName}" + (isEdit ? " (Edited)" : ""),
            DebitAmount = invoice.TotalInvoiceAmount,
            CreditAmount = 0,
            TransactionDate = invoice.InvoiceDate,
            TransactionSource = "A/R Header",
            CurrencyId = invoice.CurrencyId,
            CurrencyName = invoice.CurrencyName,
            CurrencyCode = invoice.currencyCode,
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
            : $"Posting invoice {invoice.InvoiceNumber} for supplier {invoice.CustomerName}";
        journal.IsPosted = true;
        journal.TotalDebit = totalDebit;
        journal.TotalCredit = totalCredit;
        journal.TenantId = invoice.TenantId;

        if (existingJournal == null)
            await _repositoryJournal.InsertAsync(journal);
        else
            await _repositoryJournal.UpdateAsync(journal);
    }
    public async Task<object> EditPostedInvoice(ArInvoice input)
    { 
        var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == input.CustomerId);
             if (customer == null)
             {
                 throw new Exception("Customer not found.");
             }
            
             var convertedBalance = (customer.BuyingRate == input.BuyRate)
                 ? input.Balance / input.BuyRate
                 : input.Balance * input.BuyRate;
            
             customer.Balance = convertedBalance;
             await _repositoryCustomer.UpdateAsync(customer);
     
            
             await _repositoryArInvoice.UpdateAsync(input);
             
             // === Handle Journal ===
             await CreateOrUpdateJournalAsync(input, true);

             return new
             {
                 code = 200,
                 message = "Invoice updated and balance adjusted successfully."
             };
    }
    public async Task<object> ListAll()
    {
        var data = await _repositoryArInvoice.GetAllListAsync();
        return data.OrderBy(item => item.CustomerName).ToList();
    }
    public async Task<ArInvoice> GetAsync(string customerName)
    {
        return await _repositoryArInvoice.FirstOrDefaultAsync(x => x.CustomerName.Trim().ToLower() == customerName.Trim().ToLower());
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
        var selectedInvoices = await _repositoryArInvoice.GetAllListAsync(x => invoiceIds.Contains(x.Id));
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
      
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == invoice.CustomerId);
            if (customer == null)
            {
                return new
                {
                    code = 404,
                    message = "Customer not found."
                };
            }
            var convertedBalance = (customer.BuyingRate == invoice.BuyRate)
                ? invoice.Balance / invoice.BuyRate
                : invoice.Balance * invoice.BuyRate;
            customer.Balance += convertedBalance;
            await _repositoryCustomer.UpdateAsync(customer);
            // Mark the invoice as posted
            invoice.IsPosted = true;
            await _repositoryArInvoice.UpdateAsync(invoice);
        
            // create journal entry
            await CreateOrUpdateJournalAsync(invoice, false);
        
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

        var selectedInvoices = await _repositoryArInvoice.GetAllListAsync(x => invoiceIds.Contains(x.Id));
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
                var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.Id == invoice.CustomerId);
                if (customer == null)
                {
                    return new
                    {
                        code = 404,
                        message = "Customer not found."
                    };
                }

                var convertedBalance = (customer.BuyingRate == invoice.BuyRate)
                    ? invoice.Balance / invoice.BuyRate
                    : invoice.Balance * invoice.BuyRate;

                customer.Balance -= convertedBalance;
                await _repositoryCustomer.UpdateAsync(customer);

               
                invoice.IsPosted = false;
                
                var existingJournal = await _repositoryJournal.FirstOrDefaultAsync(
                    j => j.BatchNumber == invoice.BatchNumber && j.TransactionSource == "AR");
                if (existingJournal != null)
                {
                    await _repositoryJournal.DeleteAsync(existingJournal);
                }
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
            await _repositoryArInvoice.UpdateAsync(invoice);
        }

        return new
        {
            code = 200,
            message = "Invoice(s) cancelled successfully."
        };
    }
    
    // Approve invoice
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
        var selectedInvoices = await _repositoryArInvoice.GetAllListAsync(x => invoiceIds.Contains(x.Id));
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
            await _repositoryArInvoice.UpdateAsync(invoice);
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
        var systemNumber = systemNumbers.FirstOrDefault(sn => sn.ItemName == "ArInvoiceNumbers");

        if (systemNumber == null)
        {
            return "1000";
        }

        string invoiceNumber;
        bool isDuplicate;

        do
        {
            invoiceNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";
            
            isDuplicate = await _repositoryArInvoice.CountAsync(x => x.InvoiceNumber == invoiceNumber) > 0;

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
            .FirstOrDefault(sn => sn.ItemName == "ArInvoiceBatchNumbers");
        
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "AR" + rnd.Next(1000, 9999).ToString();
                bool exists = await _repositoryArInvoice.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }
        string batchNumber;
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _repositoryArInvoice.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;
            systemNumber.LastNo++;
        }
        systemNumber.LastNo++;

        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return batchNumber;
    }

}