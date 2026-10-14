using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Linq.Expressions;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;
using TopazERP.Utils;

namespace TopazERP.DomainServices.Ledger.Vouchers;

public class PaymentVoucherManager: Abp.Domain.Services.DomainService, IPaymentVoucherManager
{
    private readonly IRepository<GlPaymentVoucher, Guid>  _repositoryPaymentVoucher;
    private readonly IRepository<SystemNumber, Guid>  _repositorySystemNumber;
    private readonly IRepository<Journal, Guid>  _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid>  _repositoryJournalDetail;
    private readonly IRepository<BankAccount, Guid>  _repositoryBankAccount;

    public PaymentVoucherManager(IRepository<GlPaymentVoucher, Guid> repositoryPaymentVoucher, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<BankAccount, Guid> repositoryBankAccount, IRepository<Journal, Guid> repositoryJournal)
    {
        _repositoryPaymentVoucher = repositoryPaymentVoucher;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositoryBankAccount = repositoryBankAccount;
        _repositoryJournal = repositoryJournal;
    }
    
    public async Task<object> Create(GlPaymentVoucher paymentVoucher)
    {
        var savedVoucher = await _repositoryPaymentVoucher.InsertAsync(paymentVoucher);
        
        //update system number ...
        var voucherBatchSystemNumber = await _repositorySystemNumber.FirstOrDefaultAsync(x=> x.ItemName == "GL-VoucherBatchNumbers" && x.ModuleName == "General Ledger");

        if (voucherBatchSystemNumber != null)
        {
            voucherBatchSystemNumber.LastNo += 1;
            
            await _repositorySystemNumber.UpdateAsync(voucherBatchSystemNumber);
        }

        return savedVoucher;
    }

    public async Task PostVouchers(PostVoucherDto voucherDto)
    {
        foreach (var voucherId in voucherDto.Ids)
        {
            var voucherInfo = await _repositoryPaymentVoucher.FirstOrDefaultAsync(voucherId);
            
            var proposedJournalHeader = await _repositoryJournal.FirstOrDefaultAsync(x => x.BatchNumber == voucherInfo.BatchNo);
            
            proposedJournalHeader.IsTemporary = false;
            proposedJournalHeader.IsPosted = false;
            await _repositoryJournal.UpdateAsync(proposedJournalHeader);
            
            var proposedJournalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == proposedJournalHeader.Id);

            foreach (var journalDetail in proposedJournalDetails)
            {
                journalDetail.IsPosted = true;
                await _repositoryJournalDetail.UpdateAsync(journalDetail);
            }
            
            voucherInfo.IsPosted = true;
            await _repositoryPaymentVoucher.UpdateAsync(voucherInfo);
        }
        
    }
    
    public async Task DeleteVouchers(PostVoucherDto voucherDto)
    {
        foreach (var voucherId in voucherDto.Ids)
        {
            var voucherInfo = await _repositoryPaymentVoucher.FirstOrDefaultAsync(voucherId);
            
            var proposedJournalHeader = await _repositoryJournal.FirstOrDefaultAsync(x => x.BatchNumber == voucherInfo.BatchNo);

            if (proposedJournalHeader != null)
            {
                await _repositoryJournal.DeleteAsync(proposedJournalHeader.Id);
            
                var proposedJournalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == proposedJournalHeader.Id);

                foreach (var journalDetail in proposedJournalDetails)
                {
                    await _repositoryJournalDetail.DeleteAsync(journalDetail.Id);
                }

                await _repositoryPaymentVoucher.DeleteAsync(voucherId);
            }
            
        }
        
        
    }
    public async Task<object> ListAll(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted);
    
        predicate.And(x => !x.IsDeleted && !x.IsPosted);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value);
        }
    
        var result = await _repositoryPaymentVoucher.GetAllListAsync(predicate);
        
        
        return result.Select(x => new 
        {
            x.Id,
            Recipient = !x.SupplierId.Equals(Guid.Empty) ? x.SupplierName : (!x.CustomerId.Equals(Guid.Empty) ? x.CustomerName : string.Empty),
            x.BatchNo, 
            x.BatchDescription,
            x.VoucherEntryDate,
            x.ModeOfPayment,
            x.BankAccountId,
            x.BankAccountName,
            x.VatWithHoldAmount,
            x.BankId,
            x.ChequeNo,
            x.BankName,
            x.NetAmount,
            x.CurrencyId,
            x.CurrencyName,
            x.CurrencyCode,
            x.BuyRate,
            x.BaseAmount,
            x.HasCommunicationServiceTax,
            x.CommunicationServiceTaxRate,
            x.HasCovidTax,
            x.CovidTaxRate,
            x.HasWithHolding,
            x.HasGetFundLevy,
            x.GetFundLevyRate,
            x.HasNationalHealthInsuranceLevy,
            x.NationalHealthInsuranceLevyRate,
            x.TotalVatAmount,
            x.GrossAmount,
            x.TotalWithheld,
            x.TotalRetained,
            x.TotalVatWithheld,
            x.VatWithHoldingAccountId,
            x.VatWithHoldingAccountName,
            x.WithHoldingAccountId,
            x.WithHoldingAccountName,
            x.WithHoldingRate,
            x.CustomerId,
            x.CustomerName,
            x.SupplierId,
            x.SupplierName,
            x.EmployeeId,
            x.EmployeeName,
            x.Posted,
            x.IsPayment,
            x.IsMultiCurrency,
            x.Details
              
        }).ToList();
    }
    
    public async Task<object> GeneratePreview(Guid id)
    {
        var result = await _repositoryPaymentVoucher.FirstOrDefaultAsync(a=> a.Id == id);

        var bankAccountInfo = await _repositoryBankAccount.FirstOrDefaultAsync(x=> x.Id == result.BankAccountId);
        
        return new
        {
            pvHeader = new
            {
                Recipient = !result.SupplierId.Equals(Guid.Empty) ? $"Pay to the order of {result.SupplierName}" : (!result.CustomerId.Equals(Guid.Empty) ? result.CustomerName : string.Empty),
                VoucherDate = $"Voucher Date: {result.VoucherEntryDate:dd-MMMM-yyyy}",
                BatchNumber = $"Batch No.: {result.BatchNo}",
                AmountInWords = $"The sum of: {AmountToWordsConverter.Convert(result.NetAmount)}",
                NetAmountPaid = $"{result.CurrencyCode} {result.NetAmount:N2}",
                result.ModeOfPayment,
                result.VatWithHoldAmount,
                ChequeNo = !string.IsNullOrEmpty(result.ChequeNo) ? $"Cheque No.: {result.ChequeNo}" : "Cheque No.: ---",
                result.NetAmount,
                result.CurrencyName,
                result.CurrencyCode,
                result.BaseAmount,
                result.TotalRetained,
                result.TotalVatAmount,
                result.GrossAmount,
                result.TotalWithheld,
                result.TotalVatWithheld,
                result.BankAccountName,
                WithHoldingRate = $"WithHolding Rate: {result.WithHoldingRate}%",
                result.Details.FirstOrDefault()?.OuName,
                BankAccountNo = bankAccountInfo != null ? $"Bank Account No.: {bankAccountInfo.AccountNo}" : string.Empty,
            },
            pvDetails = result.Details
        };
        
         
    }

    public async Task<object> GenerateReceiptVoucherPreview(Guid id)
    {
        var result = await _repositoryPaymentVoucher.FirstOrDefaultAsync(a=> a.Id == id);

        return new[]
        {
            new
            {
                recieptFrom = result.CustomerName,
                batchNumber = result.BatchNo,
                chequeNo = result.ChequeNo,
                date = result.VoucherEntryDate.ToString("dd-MMM-yyyy"),
                amountPaid = $"{result.CurrencyCode} {result.Details.Sum(a=> a.Amount):N2}",
                description = string.Join(", ", result.Details.Select(a => a.Description).Where(d => !string.IsNullOrWhiteSpace(d))), //comma separated
                receiptVoucherNo = string.Join(", ", result.Details.Select(a => a.InvoiceNo).Where(i => !string.IsNullOrWhiteSpace(i))), //comma separated,
                receiptNo = result.BatchNo,
                amountInWords = AmountToWordsConverter.Convert(result.Details.Sum(a=> a.Amount))
            }
        };
    }
    
    public async Task DeleteProposedJournal(Guid id, List<Guid> journalIds)
    {
        // Hard-delete journal details first (before the header is removed)
        foreach (var journalDetailId in journalIds)
        {
            var journalDetail = await _repositoryJournalDetail.FirstOrDefaultAsync(journalDetailId);
            if (journalDetail != null)
            {
                await _repositoryJournalDetail.HardDeleteAsync(journalDetail);
            }
        }

        // Hard-delete the journal header
        var journalHeader = await _repositoryJournal.FirstOrDefaultAsync(id);
        if (journalHeader != null)
        {
            await _repositoryJournal.HardDeleteAsync(journalHeader);
        }
    }
    public async Task<object> GetDetails(Guid id)
    {
        var voucherInfo = await _repositoryPaymentVoucher.FirstOrDefaultAsync(a => a.Id == id);
        
        var proposedJournalHeader = await _repositoryJournal.FirstOrDefaultAsync(x => x.BatchNumber == voucherInfo.BatchNo);
        
        var proposedJournalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == proposedJournalHeader.Id);
        
        return new
        {
            voucherInfo,
            proposedJournalDetails,
            proposedJournalHeader,
        };
    }
    public async Task<object> ListAll(DateTime? startDate, DateTime? endDate, string voucherType)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted && !x.IsPosted);
    
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value.Date);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value.Date);
        }

        if (!string.IsNullOrEmpty(voucherType))
        {
            if (voucherType.Equals("supplier"))
            {
                predicate = predicate.And(x => x.SupplierId != Guid.Empty);
            }
            
            if (voucherType.Equals("employee"))
            {
                predicate = predicate.And(x => x.EmployeeId != Guid.Empty);
            }
            
            if (voucherType.Equals("customer"))
            {
                predicate = predicate.And(x => x.CustomerId != Guid.Empty);
            }
        }
    
        var voucherList = await _repositoryPaymentVoucher.GetAllListAsync(predicate);

        Dictionary<string,object> proposedJournalEntries = new Dictionary<string,object>();
        
        //query for associated journal entries using the batch ids...
        
        foreach (var voucher in voucherList)
        {
            var journalEntries = await _repositoryJournalDetail.GetAllListAsync(a=> a.BatchNumber == voucher.BatchNo);
            proposedJournalEntries.Add(voucher.BatchNo, journalEntries);
        }   
        
        return voucherList.Select(x => new 
        {
            x.Id,
            Recipient = !x.SupplierId.Equals(Guid.Empty) ? x.SupplierName : !x.CustomerId.Equals(Guid.Empty) ? x.CustomerName : !x.EmployeeId.Equals(Guid.Empty) ? x.EmployeeName : null,
            BatchNumber = x.BatchNo, 
            x.BatchDescription,
            VoucherEntryDate = x.VoucherEntryDate.ToString("dd-MMM-yyyy"),
            x.ModeOfPayment,
            x.BankAccountId,
            x.BankAccountName,
            x.VatWithHoldAmount,
            x.BankId,
            x.ChequeNo,
            x.BankName,
            x.NetAmount,
            x.CurrencyId,
            x.CurrencyName,
            x.CurrencyCode,
            x.BuyRate,
            x.BaseAmount,
            x.HasCommunicationServiceTax,
            x.CommunicationServiceTaxRate,
            x.HasCovidTax,
            x.CovidTaxRate,
            x.HasWithHolding,
            x.HasGetFundLevy,
            x.GetFundLevyRate,
            x.HasNationalHealthInsuranceLevy,
            x.NationalHealthInsuranceLevyRate,
            x.TotalVatAmount,
            x.GrossAmount,
            x.TotalWithheld,
            x.TotalRetained,
            x.TotalVatWithheld,
            x.VatWithHoldingAccountId,
            x.VatWithHoldingAccountName,
            x.WithHoldingAccountId,
            x.WithHoldingAccountName,
            x.WithHoldingRate,
            x.CustomerId,
            x.CustomerName,
            x.SupplierId,
            x.SupplierName,
            x.EmployeeId,
            x.EmployeeName,
            x.Posted,
            x.IsPayment,
            x.IsMultiCurrency,
            x.Details,
            ProposedJournalEntries = proposedJournalEntries[x.BatchNo]
              
        }).ToList();
    }
    public async Task<object> GetUnpaidWithholdingVoucher(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted && x.TotalWithheld > 0);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value);
        }
    
        var result = await _repositoryPaymentVoucher.GetAllListAsync(predicate);
        return result;
    }
    public async Task<object> GetUnpaidVatWithholdingVoucher(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted && x.VatWithHoldAmount > 0 && x.HasVatWithhold);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value);
        }
    
        var result = await _repositoryPaymentVoucher.GetAllListAsync(predicate);
        return result;
    }
    public async Task<object> GetUnpaidRetensions(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted && x.TotalRetained > 0);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value);
        }
    
        var result = await _repositoryPaymentVoucher.GetAllListAsync(predicate);
        return result;
    }
    
    public async Task<object> GetPaidWithholding(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value);
        }
    
        var result = await _repositoryPaymentVoucher.GetAllListAsync(predicate);
        return result;
    }
    
    public async Task<object> GetPaidVatWithholding(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<GlPaymentVoucher>(x => !x.IsDeleted);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.VoucherEntryDate <= endDate.Value);
        }
    
        var result = await _repositoryPaymentVoucher.GetAllListAsync(predicate);
        return result;
    }
    
    public async Task Update(GlPaymentVoucher paymentVoucher)
    {
        await _repositoryPaymentVoucher.UpdateAsync(paymentVoucher);
    }
    
    public async Task Delete(Guid id)
    {
        await _repositoryPaymentVoucher.DeleteAsync(id);
    }
    
}