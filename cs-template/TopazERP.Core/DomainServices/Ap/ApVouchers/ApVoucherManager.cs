using Abp.Domain.Repositories;
using TopazERP.DomainServices.Ap.ApVouchers.Dto;
using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Ap.ApVouchers;

public class ApVoucherManager : Abp.Domain.Services.DomainService, IApVoucherManager
{
    private readonly IRepository<ApVoucher, Guid> _apVoucherRepository;
    private readonly IRepository<ApInvoice, Guid> _apInvoiceRepository;
    private readonly IRepository<Supplier, Guid> _supplierRepository;
    private readonly IRepository<ApInvoicePaymentRecords, Guid> _paymentRecordsRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;

    public ApVoucherManager(IRepository<ApVoucher, Guid> apVoucherRepository, IRepository<Supplier, Guid> supplierRepository, IRepository<ApInvoice, Guid> apInvoiceRepository, IRepository<ApInvoicePaymentRecords, Guid> paymentRecordsRepository, IRepository<Bank, Guid> bankBranchRepository, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<SystemNumber, Guid> repositorySystemNumber)
    {
        _apVoucherRepository = apVoucherRepository;
        _apInvoiceRepository = apInvoiceRepository;
        _paymentRecordsRepository = paymentRecordsRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositorySystemNumber = repositorySystemNumber;
        _supplierRepository = supplierRepository;
        
    }
    public async Task<object> ListAll()
    {
        var vouchers = await _apVoucherRepository.GetAllListAsync();
        return vouchers.OrderBy(item => item.SupplierName).ToList();
    }
 
    public async Task<object> GetInvoicesBySupplierId(Guid supplierId)
    {
        var invoices = await _apInvoiceRepository.GetAllListAsync(x => x.SupplierId == supplierId);
        return invoices;
    }

    public async Task<object> Create(ApVoucher input)
    {
        // generate voucher number if not provided
        if (string.IsNullOrWhiteSpace(input.VoucherNumber) || input.VoucherNumber.Trim() == "0")
        {
            input.VoucherNumber = await GenerateVoucherNumberAsync();
        }
        if (string.IsNullOrWhiteSpace(input.BatchNumber) || input.BatchNumber.Trim() == "0")
        {
            input.BatchNumber = await GenerateBatchNumberAsync();
        }
        var existingPayment = await _apVoucherRepository.FirstOrDefaultAsync(x => x.BatchNumber == input.BatchNumber);
        if (existingPayment != null)
        {
            return new
            {
            
                code = 400,
                message = "Payment Voucher with the same batch number already exists."
            };
        }
        
        var existingEntry = await _apVoucherRepository.FirstOrDefaultAsync(
            x => x.VoucherNumber.Trim().ToLower() == input.VoucherNumber.Trim().ToLower());

        if (existingEntry != null)
        {
            return new
            {
                code = 400,
                message = "Voucher number already exists. Try next number!"
            };
        }

        // Validate payment amount
        if (input.PaymentAmount == 0)
        {
            return new
            {
                code = 400,
                message = "Payment amount cannot be zero."
            };
        }

        // Validate invoice selection
        if (input.InvoiceId == null)
        {
            return new
            {
                code = 400,
                message = "Please select an invoice."
            };
        }

        // Create a new voucher
       var createdEntity = await _apVoucherRepository.InsertAsync(input);

        return new
        {
            code = 200,
            id = createdEntity.Id,
            voucherNumber = createdEntity.VoucherNumber,
            message = "Voucher created successfully."
        };
    }
    public async Task Update(ApVoucher entity)
    {
        await _apVoucherRepository.UpdateAsync(entity);
    }
    
    public async Task<ApVoucher> GetAsync(string SupplierName)
    {
        return await _apVoucherRepository.FirstOrDefaultAsync(x => x.SupplierName.Trim().ToLower() == SupplierName.Trim().ToLower());
    }
    
    /*public async Task Delete(Guid Id)
    {
        await _apVoucherRepository.DeleteAsync(Id);
    }*/
    public async Task Delete(Guid id)
    {
        var voucher = await _apVoucherRepository.FirstOrDefaultAsync(id);

        if (voucher == null)
            throw new Exception("Voucher not found");

        //  If not posted → just delete
        if (!voucher.IsPosted)
        {
            await _apVoucherRepository.DeleteAsync(voucher);
            return;
        }

        // =========================
        // REVERSE POSTING
        // =========================

        // 1. Reverse Journal (delete journal + details)
        var journal = await _repositoryJournal
            .FirstOrDefaultAsync(j => j.BatchNumber == voucher.BatchNumber);

        if (journal != null)
        {
            var journalDetails = await _repositoryJournalDetail
                .GetAllListAsync(d => d.JournalId == journal.Id);

            foreach (var detail in journalDetails)
            {
                await _repositoryJournalDetail.DeleteAsync(detail);
            }

            await _repositoryJournal.DeleteAsync(journal);
        }

        // 2. Reverse Invoice + Supplier
        var invoice = await _apInvoiceRepository
            .FirstOrDefaultAsync(i => i.Id.ToString() == voucher.InvoiceId);

        var supplier = await _supplierRepository
            .FirstOrDefaultAsync(s => s.Id == voucher.SupplierId);

        if (invoice != null && supplier != null)
        {
            decimal totalWithHolding = voucher.VATWithHeld + voucher.WithHeld;
            decimal totalDeduction = totalWithHolding + voucher.NetAmount;

            decimal paymentRate = voucher.PayCurrencyBuyRate;
            decimal invoiceRate = voucher.BuyRate;

            var convertedAmount = totalDeduction * (paymentRate / invoiceRate);
            var convertedNetAmount = voucher.NetAmount * (paymentRate / invoiceRate);

            decimal supplierBuyingRate = supplier?.buyingRate ?? 1;
            decimal supplierCurrencyAmount = convertedAmount * (invoiceRate / supplierBuyingRate);

            // Reverse exactly what Post did
            invoice.Balance += convertedAmount;
            invoice.PaidAmount -= convertedNetAmount;

            supplier.Balance += supplierCurrencyAmount;

            // Recalculate status (mirror logic)
            if (invoice.Balance <= 0)
                invoice.Status = 2;
            else if (invoice.PaidAmount > 0)
                invoice.Status = 1;
            else
                invoice.Status = 0;

            await _apInvoiceRepository.UpdateAsync(invoice);
            await _supplierRepository.UpdateAsync(supplier);
        }

        // 3. Delete Payment Records
        var payments = await _paymentRecordsRepository
            .GetAllListAsync(p => p.PaymentId == voucher.Id);

        foreach (var payment in payments)
        {
            await _paymentRecordsRepository.DeleteAsync(payment);
        }

        // =========================
        // 🗑 FINAL DELETE
        // =========================
        await _apVoucherRepository.DeleteAsync(voucher);
    }
    public async Task<object> DeleteMultiple(List<Guid> ids)
    {
        if (ids == null || !ids.Any())
            return new { code = 400, message = "No vouchers selected." };

        var vouchers = await _apVoucherRepository.GetAllListAsync(x => ids.Contains(x.Id));

        if (vouchers == null || !vouchers.Any())
            return new { code = 400, message = "No vouchers found." };

        foreach (var voucher in vouchers)
        {
            // =========================
            //  REVERSE IF POSTED
            // =========================
            if (voucher.IsPosted)
            {
                // 1. Reverse Journal
                var journal = await _repositoryJournal
                    .FirstOrDefaultAsync(j => j.BatchNumber == voucher.BatchNumber);

                if (journal != null)
                {
                    var details = await _repositoryJournalDetail
                        .GetAllListAsync(d => d.JournalId == journal.Id);

                    foreach (var detail in details)
                    {
                        await _repositoryJournalDetail.DeleteAsync(detail);
                    }

                    await _repositoryJournal.DeleteAsync(journal);
                }

                // 2. Reverse Invoice + Supplier
                var invoice = await _apInvoiceRepository
                    .FirstOrDefaultAsync(i => i.Id.ToString() == voucher.InvoiceId);

                var supplier = await _supplierRepository
                    .FirstOrDefaultAsync(s => s.Id == voucher.SupplierId);

                if (invoice != null && supplier != null)
                {
                    decimal totalWithHolding = voucher.VATWithHeld + voucher.WithHeld;
                    decimal totalDeduction = totalWithHolding + voucher.NetAmount;

                    decimal paymentRate = voucher.PayCurrencyBuyRate;
                    decimal invoiceRate = voucher.BuyRate;

                    var convertedAmount = totalDeduction * (paymentRate / invoiceRate);
                    var convertedNetAmount = voucher.NetAmount * (paymentRate / invoiceRate);

                    decimal supplierBuyingRate = supplier?.buyingRate ?? 1;
                    decimal supplierCurrencyAmount = convertedAmount * (invoiceRate / supplierBuyingRate);

                    // Reverse
                    invoice.Balance += convertedAmount;
                    invoice.PaidAmount -= convertedNetAmount;

                    supplier.Balance += supplierCurrencyAmount;

                    // Recalculate status
                    if (invoice.Balance <= 0)
                        invoice.Status = 2;
                    else if (invoice.PaidAmount > 0)
                        invoice.Status = 1;
                    else
                        invoice.Status = 0;

                    await _apInvoiceRepository.UpdateAsync(invoice);
                    await _supplierRepository.UpdateAsync(supplier);
                }

                // 3. Delete Payment Records
                var payments = await _paymentRecordsRepository
                    .GetAllListAsync(p => p.PaymentId == voucher.Id);

                foreach (var payment in payments)
                {
                    await _paymentRecordsRepository.DeleteAsync(payment);
                }
            }

            // =========================
            // 🗑 DELETE VOUCHER
            // =========================
            await _apVoucherRepository.DeleteAsync(voucher);
        }

        return new
        {
            code = 200,
            message = "Vouchers deleted successfully."
        };
    }
    
    public async Task<object> PostVouchers(List<Guid> voucherIds)
    {    
       // Validate voucher list
        if (voucherIds == null || !voucherIds.Any())
        {
            return new { code = 400, message = "No vouchers selected." };
        }

        // Get the selected vouchers
        var vouchers = await _apVoucherRepository.GetAllListAsync(x => voucherIds.Contains(x.Id));

        // Validate vouchers
        if (vouchers == null || !vouchers.Any())
        {
            return new { code = 400, message = "No vouchers found." };
        }

        if (vouchers.Any(x => x.IsPosted))
        {
            return new { code = 400, message = "One or more vouchers are already posted." };
        }

        // Get related invoices
        var invoiceIds = vouchers.Select(v => v.InvoiceId).Distinct();
        var invoices = await _apInvoiceRepository.GetAllListAsync(i => invoiceIds.Contains(i.Id.ToString()));

        // Process vouchers
        foreach (var voucher in vouchers)
        {
            if (voucher.IsPosted) continue;
            var supplier = await _supplierRepository.FirstOrDefaultAsync(x => x.Id == voucher.SupplierId);
            voucher.IsPosted = true;

            var journalId = Guid.NewGuid();
            
            var journal = new Journal
            {
                Id = journalId,
                BatchNumber = voucher.BatchNumber,
                TransactionSource = "AP",
                BatchDate = voucher.PaymentDate,
                BatchDescription = $"A/P Voucher - {voucher.SupplierName} - {voucher.PaymentDate:yyyy-MM-dd}",
                IsPosted = true,
                TenantId = voucher.TenantId,
            };

            decimal totalDebit = 0;
            decimal totalCredit = 0;

            await _repositoryJournalDetail.InsertAsync(new JournalDetail
            {
                Id = Guid.NewGuid(),
                JournalId = journalId,
                AccountId = voucher.LiabilityAccountId,
                AccountName = voucher.LiabilityAccountName,
                DebitAmount = voucher.Total,
                ReferenceNumber = voucher.VoucherNumber,
                CreditAmount = 0,
                Description = $"Voucher Debit - {voucher.VoucherNumber}",
                TransactionDate = voucher.PaymentDate,
                TransactionSource = "AP",
                CurrencyId = voucher.CurrencyId,
                CurrencyName = voucher.CurrencyName,
                CurrencyCode = voucher.CurrencyCode,
                BuyRate = voucher.BuyRate,
                SellRate = voucher.SellRate,
                IsMultiCurrency = voucher.IsMultiCurrency,
                IsPosted = true,
                BatchNumber = voucher.BatchNumber,
                BatchDate = voucher.PaymentDate
                
                
            });
            
             
            totalDebit += voucher.Total;

            // Credit: Net payment (bank/cash)
            
            await _repositoryJournalDetail.InsertAsync(new JournalDetail
            {
                Id = Guid.NewGuid(),
                JournalId = journalId,
                AccountId = voucher.BankAccountId,
                AccountName = voucher.BankAccountName,
                DebitAmount = 0,
                CreditAmount = voucher.NetAmount,
                ReferenceNumber = voucher.VoucherNumber,
                Description = $"Voucher {voucher.BatchNumber} - Cheque NO:{voucher.ChequeNumber} - {voucher.SupplierName}",
                TransactionDate = voucher.PaymentDate,
                TransactionSource = "AP",
                CurrencyId = voucher.PayCurrencyId,
                CurrencyName = voucher.PayCurrencyName,
                CurrencyCode = voucher.PayCurrencyCode,
                BuyRate = voucher.PayCurrencyBuyRate,
                SellRate = voucher.PayCurrencySellRate,
                IsMultiCurrency = voucher.IsMultiCurrency,
                IsPosted = true,
                BatchNumber = voucher.BatchNumber,
                BatchDate = voucher.PaymentDate
                
            });
            
             
            totalCredit += voucher.NetAmount;

            // Credit: Withholding
            if (voucher.WithHeld > 0 && voucher.isWithHolding)
            {
                
                await _repositoryJournalDetail.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = voucher.CreditAccountId,
                    AccountName = voucher.CreditAccountName,
                    DebitAmount = 0,
                    CreditAmount = voucher.WithHeld,
                    Description = $"{voucher.WithHoldingRate}% Withholding Tax - {voucher.SupplierName}",
                    TransactionDate = voucher.PaymentDate,
                    TransactionSource = "AP",
                    CurrencyId = voucher.CurrencyId,
                    CurrencyName = voucher.CurrencyName,
                    CurrencyCode = voucher.CurrencyCode,
                    BuyRate = voucher.BuyRate,
                    SellRate = voucher.SellRate,
                    IsMultiCurrency = voucher.IsMultiCurrency,
                    IsPosted = true,
                    BatchNumber = voucher.BatchNumber,
                    BatchDate = voucher.PaymentDate
                
                });
                
                
                totalCredit += voucher.WithHeld;
            }

            // Credit: VAT Withholding
            if (voucher.VATWithHeld > 0 && voucher.isVatWithHolding)
            {
                
                await _repositoryJournalDetail.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = voucher.VatWithHoldAccountId,
                    AccountName = voucher.VatWithHoldAccountName,
                    DebitAmount = 0,
                    CreditAmount = voucher.VATWithHeld,
                    Description = $"7% Vat Withholding - {voucher.SupplierName}",
                    TransactionDate = voucher.PaymentDate,
                    TransactionSource = "AP",
                    CurrencyId = voucher.CurrencyId,
                    CurrencyName = voucher.CurrencyName,
                    CurrencyCode = voucher.CurrencyCode,
                    BuyRate = voucher.BuyRate,
                    SellRate = voucher.SellRate,
                    IsMultiCurrency = voucher.IsMultiCurrency,
                    IsPosted = true,
                    BatchNumber = voucher.BatchNumber,
                    BatchDate = voucher.PaymentDate
                
                });
                
                totalCredit += voucher.VATWithHeld;
            }

            // Save totals
            journal.TotalDebit = totalDebit;
            journal.TotalCredit = totalCredit;

            await _repositoryJournal.InsertAsync(journal);

            // Update associated invoice balance
            var associatedInvoice = invoices.FirstOrDefault(i => i.Id.ToString() == voucher.InvoiceId);
            if (associatedInvoice != null)
            {
                var totalWithHolding = voucher.VATWithHeld + voucher.WithHeld;
                var totalDeduction = totalWithHolding + voucher.NetAmount;
                Decimal paymentRate = voucher.PayCurrencyBuyRate;
                decimal invoiceRate = voucher.BuyRate;
                var convertedAmount = totalDeduction * (paymentRate / invoiceRate);

                //convert net amount to invoice currency
                decimal convertedNetAmount  = voucher.NetAmount * (paymentRate / invoiceRate);
                decimal supplierBuyingRate = supplier?.buyingRate ?? 1;
                decimal supplierCurrencyAmount = convertedAmount * (invoiceRate / supplierBuyingRate);
                associatedInvoice.Balance -= convertedAmount;
                associatedInvoice.PaidAmount += convertedNetAmount;
                supplier.Balance -= supplierCurrencyAmount;
                if (convertedAmount >= associatedInvoice.Balance)
                {
                    associatedInvoice.Status = 2; 
                }
                else if (convertedNetAmount > 0)
                {
                    associatedInvoice.Status = 1; 
                }
                else
                {
                    associatedInvoice.Status = 0; 
                }
                var bankBranch = await _supplierRepository.FirstOrDefaultAsync(x => x.Id == voucher.BankBranchId);
                var paymentRecord = new ApInvoicePaymentRecords
                {
                    PaymentId = voucher.Id,
                    InvoiceId = associatedInvoice.Id,
                    Amount = voucher.NetAmount,
                    ConvertedAmount = convertedAmount,
                    PaymentDate = voucher.PaymentDate,
                    BankName = voucher.BankName,
                    BankBranch = bankBranch?.Name,
                    CurrencyName = voucher.CurrencyName,
                    CurrencyCode = voucher.CurrencyCode,
                    ModeOfPayment = voucher.ModeOfPayment,
                    ChequeNo = voucher.ChequeNumber,
                    SupplierName = voucher.SupplierName,
                    InvoiceNo = associatedInvoice.InvoiceNumber,
                    IsPosted = true,
                };
                await _paymentRecordsRepository.InsertAsync(paymentRecord);
                await _apInvoiceRepository.UpdateAsync(associatedInvoice);
                await _supplierRepository.UpdateAsync(supplier);
            }
            // Update voucher
            await _apVoucherRepository.UpdateAsync(voucher);
        }

        return new { code = 200, message = "Vouchers posted successfully." };
    }
    
    private async Task<string> GenerateVoucherNumberAsync()
    {
        int currentYear = DateTime.UtcNow.Year;
    
        var lastVoucher = await _apVoucherRepository.GetAllListAsync();
        var lastVoucherNumber = lastVoucher
            .Where(x => x.VoucherNumber.StartsWith(currentYear.ToString()))
            .Select(x => x.VoucherNumber)
            .OrderByDescending(x => x)
            .FirstOrDefault();
    
        int nextNumber = 1;
        if (lastVoucherNumber != null)
        {
            string lastNumberStr = lastVoucherNumber.Split('-').Last();
            if (int.TryParse(lastNumberStr, out int lastNumber))
            {
                nextNumber = lastNumber + 1;
            }
        }
        string voucherNumber = $"{currentYear}-{nextNumber:D4}";
    
        return voucherNumber;
    } 
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "AP-VoucherBatchNumbers");

        // If no system number exists, generate a random batch number as fallback
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = "APPV" + rnd.Next(1000, 9999).ToString();
                bool exists = await _apVoucherRepository.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }

        string batchNumber;

        // Generate the next available batch number
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _apVoucherRepository.CountAsync(x => x.BatchNumber == batchNumber) > 0;

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