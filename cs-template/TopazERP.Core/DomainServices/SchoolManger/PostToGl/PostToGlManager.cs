using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Ledger;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.PostToGl;

public class PostToGlManager:DomainService, IPostToGlManager
{
    private readonly IRepository<Bill, Guid> _billRepository;
    private readonly IRepository<SchBillAccount, Guid> _schBillAccountRepository;
    private readonly IRepository<SchPayment, Guid> _repositoryPayment;
    private readonly IRepository<SchCreditMemo, Guid> _repositoryMemo;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<Currency, Guid> _repositoryCurrency;
    private readonly IRepository<CoaDetail, Guid> _repositoryCoaDetail;
    private readonly IRepository<SchoolProfile, Guid> _repositorySchoolProfile;
    private readonly IRepository<BoardingItem, Guid> _repositoryBoardingItem;
    private readonly IRepository<SupplementaryItem, Guid> _repositorySupplementaryItem;
    private readonly IRepository<FeesDescription, Guid> _repositoryFeesDescription;

    public PostToGlManager(IRepository<Bill, Guid> billRepository, IRepository<SchPayment, Guid> repositoryPayment,
        IRepository<SchCreditMemo, Guid> repositoryMemo, IRepository<SchBillAccount, Guid> schBillAccountRepository,
        IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail,
        IRepository<Currency, Guid> repositoryCurrency, IRepository<CoaDetail, Guid> repositoryCoaDetail, IRepository<SchoolProfile, Guid> repositorySchoolProfile, IRepository<BoardingItem, Guid> repositoryBoardingItem, IRepository<SupplementaryItem, Guid> repositorySupplementaryItem, IRepository<FeesDescription, Guid> repositoryFeesDescription)
    {
        _billRepository = billRepository;
        _repositoryPayment = repositoryPayment;
        _repositoryMemo = repositoryMemo;
        _schBillAccountRepository = schBillAccountRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositoryCurrency = repositoryCurrency;
        _repositoryCoaDetail = repositoryCoaDetail;
        _repositorySchoolProfile = repositorySchoolProfile;
        _repositoryBoardingItem = repositoryBoardingItem;
        _repositorySupplementaryItem = repositorySupplementaryItem;
        _repositoryFeesDescription = repositoryFeesDescription;
    }

    public async Task<object> PostCreditMemos(List<Guid> memoIds)
    {
        if (!memoIds.Any())
            return new { code = 400, message = "No payments selected." };

        var selectedPayments = await _repositoryMemo.GetAllListAsync(x => memoIds.Contains(x.Id));

        if (!selectedPayments.Any())
            return new { code = 404, message = "Payments not found." };
        
        foreach (var payment in selectedPayments)
        {
            
            payment.IsPosted = true;
            await _repositoryMemo.UpdateAsync(payment);
            
            var currency = await _repositoryCurrency.FirstOrDefaultAsync(payment.CurrencyId);

            var debitAccount = await _repositoryCoaDetail.FirstOrDefaultAsync(payment.DebitGlId);
            var creditAccount = await _repositoryCoaDetail.FirstOrDefaultAsync(payment.CreditGlId);

            var currencyName = currency?.CurrencyName ?? "";
            var currencyCode = currency?.CurrencyCode ?? "";
            var sellRate = currency?.SellRate ?? payment.Rate;

            var debitAccountName = debitAccount != null
                ? $"{debitAccount.AccountNo} - {debitAccount.AccountName}"
                : "";

            var creditAccountName = creditAccount != null
                ? $"{creditAccount.AccountNo} - {creditAccount.AccountName}"
                : "";

            var referenceNumber = new Random().Next(100, 999).ToString();
          
            var journalId = payment.JournalId;
            decimal totalDebit = 0;
            decimal totalCredit = 0;
            var journal = new Journal
            {
                Id = journalId,
                BatchNumber = payment.BatchNumber,
                TransactionSource = "SM",
                BatchDate = payment.Date,
                BatchDescription = $"Student Credit Memo",
                IsPosted = true,
                TotalCredit = totalCredit,
                TotalDebit = totalDebit,
                TenantId = payment.TenantId,
            };
            await _repositoryJournalDetail.InsertAsync(new JournalDetail
            {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = payment.DebitGlId,
            AccountName = debitAccountName,
            OuId = Guid.Empty,
            OuName = null,
            ReferenceNumber = referenceNumber,
            Description = payment.Description,
            DebitAmount = payment.AmountToCredit,
            CreditAmount = 0,
            TransactionDate = payment.Date,
            TransactionSource = "SM Credit Memos",
            CurrencyId = payment.CurrencyId,
            CurrencyName = currencyName,
            CurrencyCode = currencyCode,
            BuyRate = payment.Rate,
            SellRate = sellRate,
            IsMultiCurrency = payment.IsMultiCurrency,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            BatchNumber = payment.BatchNumber,
            BatchDate = payment.Date,
            IsPosted = true
        });
        await _repositoryJournalDetail.InsertAsync(new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = payment.CreditGlId,
            AccountName = creditAccountName,
            OuId = Guid.Empty,
            OuName = null,
            ReferenceNumber = referenceNumber,
            Description = payment.Description,
            DebitAmount = 0,
            CreditAmount = payment.AmountToCredit,
            TransactionDate = payment.Date,
            TransactionSource = "SM Credit Memos",
            CurrencyId = payment.CurrencyId,
            CurrencyName = currencyName,
            CurrencyCode = currencyCode,
            BuyRate = payment.Rate,
            SellRate = sellRate,
            IsMultiCurrency = payment.IsMultiCurrency,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            BatchNumber = payment.BatchNumber,
            BatchDate = payment.Date,
            IsPosted = true
        });
        totalDebit += payment.AmountToCredit;
        totalCredit += payment.AmountToCredit;
        journal.TotalDebit = totalDebit;
        journal.TotalCredit = totalCredit;
        
        await _repositoryJournal.InsertAsync(journal);
        }

        return new { code = 200, message = "Credit Memo(s) posted successfully." };
    }
    public async Task<object> PostPayments(List<Guid> paymentsIds)
    {
        if (!paymentsIds.Any())
            return new { code = 400, message = "No payments selected." };

        var selectedPayments = await _repositoryPayment.GetAllListAsync(x => paymentsIds.Contains(x.Id));

        if (!selectedPayments.Any())
            return new { code = 404, message = "Payments not found." };
        
        foreach (var payment in selectedPayments)
        {
            
            payment.IsPosted = true;
            await _repositoryPayment.UpdateAsync(payment);
            
            var currency = await _repositoryCurrency.FirstOrDefaultAsync(payment.CurrencyId);

            var bankAccount = await _repositoryCoaDetail.FirstOrDefaultAsync(payment.BankGlId);
            var debtorAccount = await _repositoryCoaDetail.FirstOrDefaultAsync(payment.DebitGlId);

            var bankAccountName = bankAccount != null
                ? $"{bankAccount.AccountNo} - {bankAccount.AccountName}"
                : "";

            var debtorAccountName = debtorAccount != null
                ? $"{debtorAccount.AccountNo} - {debtorAccount.AccountName}"
                : "";

            var currencyName = currency?.CurrencyName ?? "";
            var currencyCode = currency?.CurrencyCode ?? "";
            var sellRate = currency?.SellRate ?? payment.BuyRate;

           

            var referenceNumber = new Random().Next(100, 999).ToString();
          
            var journalId = payment.JournalId;
            decimal totalDebit = 0;
            decimal totalCredit = 0;
            var journal = new Journal
            {
                Id = journalId,
                BatchNumber = payment.BatchNumber,
                TransactionSource = "SM",
                BatchDate = payment.PaymentDate,
                BatchDescription = $"Student Bill Payment",
                IsPosted = true,
                TotalCredit = totalCredit,
                TotalDebit = totalDebit,
                TenantId = payment.TenantId,
            };
            await _repositoryJournalDetail.InsertAsync(new JournalDetail
            {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = payment.BankGlId,
            AccountName = bankAccountName,
            OuId = Guid.Empty,
            OuName = null,
            ReferenceNumber = referenceNumber,
            Description = payment.Description,
            DebitAmount = payment.AmountToPaid,
            CreditAmount = 0,
            TransactionDate = payment.PaymentDate,
            TransactionSource = "SM Payments",
            CurrencyId = payment.CurrencyId,
            CurrencyName = currencyName,
            CurrencyCode = currencyCode,
            BuyRate = payment.BuyRate,
            SellRate = sellRate,
            IsMultiCurrency = payment.IsMultiCurrency,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            BatchNumber = payment.BatchNumber,
            BatchDate = payment.PaymentDate,
            IsPosted = true
        });
        await _repositoryJournalDetail.InsertAsync(new JournalDetail
        {
            Id = Guid.NewGuid(),
            JournalId = journalId,
            AccountId = payment.DebitGlId,
            AccountName = debtorAccountName,
            OuId = Guid.Empty,
            OuName = null,
            ReferenceNumber = referenceNumber,
            Description = payment.Description,
            DebitAmount = 0,
            CreditAmount = payment.AmountToPaid,
            TransactionDate = payment.PaymentDate,
            TransactionSource = "SM Payments",
            CurrencyId = payment.CurrencyId,
            CurrencyName = currencyName,
            CurrencyCode = currencyCode,
            BuyRate = payment.BuyRate,
            SellRate = sellRate,
            IsMultiCurrency = payment.IsMultiCurrency,
            IsReconciled = false,
            IsOpeningBalance = false,
            IsConsolidated = false,
            BatchNumber = payment.BatchNumber,
            BatchDate = payment.PaymentDate,
            IsPosted = true
        });
        totalDebit += payment.AmountToPaid;
        totalCredit += payment.AmountToPaid;
        journal.TotalDebit = totalDebit;
        journal.TotalCredit = totalCredit;
        
        await _repositoryJournal.InsertAsync(journal);
        }

        return new { code = 200, message = "Payment(s) posted successfully." };
    }
    public async Task<object> PostBills(List<Guid> billIds)
    {
        if (!billIds.Any())
            return new { code = 400, message = "No bills selected." };

        var selectedPayments = await _billRepository.GetAllListAsync(x => billIds.Contains(x.Id));

        if (!selectedPayments.Any())
            return new { code = 404, message = "Bills not found." };
        var schoolProfile = await _repositorySchoolProfile.GetAll().FirstOrDefaultAsync();
        var currency = await _repositoryCurrency.FirstOrDefaultAsync(schoolProfile.CurrencyId);

        var billAccounts = await _schBillAccountRepository.GetAllListAsync();
        var accountMap = billAccounts
            .ToDictionary(x => (x.BillTypeId, x.FeeItemId), x => x);
       
        //fee names
        var feeItems = await _repositoryFeesDescription.GetAllListAsync();
        var supplementaryItems = await _repositorySupplementaryItem.GetAllListAsync();
        var boardingItems = await _repositoryBoardingItem.GetAllListAsync();

        var feeItemMap = feeItems.ToDictionary(x => x.Id, x => x.Description);
        var supplementaryMap = supplementaryItems.ToDictionary(x => x.Id, x => x.Name);
        var boardingMap = boardingItems.ToDictionary(x => x.Id, x => x.Name);
        
        foreach (var bill in selectedPayments)
        {
           

            var studentsCount = bill.Students.Count(x => x.ToBeBilled);
            var studentTotalAmount = bill.Students.Where(x => x.ToBeBilled).Sum(x => x.Amount);
            var currencyName = currency?.CurrencyName ?? "";
            var currencyCode = currency?.CurrencyCode ?? "";
            var sellRate = currency?.SellRate ?? 1;
            var buyRate = currency?.BuyRate ?? 1;

            var journalId = bill.JournalId;

            decimal totalDebit = 0;
            decimal totalCredit = 0;

            var referenceNumber = new Random().Next(100, 999).ToString();

            var journal = new Journal
            {
                Id = journalId,
                BatchNumber = bill.BatchNumber,
                TransactionSource = "SM",
                BatchDate = bill.BillDate,
                BatchDescription = "Student Bills",
                IsPosted = true,
                TotalCredit = 0,
                TotalDebit = 0,
                TenantId = bill.TenantId
            };

            
            // ==============================
            // LOOP BILL DETAILS (CORE LOGIC)
            // ==============================
            foreach (var detail in bill.Details)
            {
                if (!accountMap.TryGetValue((bill.BillTypeId, detail.FeeItemId), out var acc))
                {
                    return new
                    {
                        code = 400,
                        message = "One or more fee items do not have Bill GL Account. Please complete the Bill Account setup before posting."
                    };
                }

                var debitAmount = bill.BillTypeId switch
                {
                    1 or 3 => detail.Amount * studentsCount,
                    2 => studentTotalAmount,
                    _ => 0
                };

                var debitAccount = await _repositoryCoaDetail.FirstOrDefaultAsync(acc.DebitGlId);
                var creditAccount = await _repositoryCoaDetail.FirstOrDefaultAsync(acc.CreditGlId);

                var debitAccountName = debitAccount != null
                    ? $"{debitAccount.AccountNo} - {debitAccount.AccountName}"
                    : "";

                var creditAccountName = creditAccount != null
                    ? $"{creditAccount.AccountNo} - {creditAccount.AccountName}"
                    : "";

                totalDebit += debitAmount;
                totalCredit += debitAmount;
                
                var feeItemName = "Unknown Fee Item";

                if (bill.BillTypeId == 1)
                {
                    feeItemMap.TryGetValue(detail.FeeItemId, out feeItemName);
                }
                else if (bill.BillTypeId == 2)
                {
                    supplementaryMap.TryGetValue(detail.FeeItemId, out feeItemName);
                }
                else if (bill.BillTypeId == 3)
                {
                    boardingMap.TryGetValue(detail.FeeItemId, out feeItemName);
                }

                // DEBIT ENTRY
                await _repositoryJournalDetail.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = acc.DebitGlId,
                    AccountName = debitAccountName,
                    ReferenceNumber = referenceNumber,
                    Description = feeItemName,
                    DebitAmount = debitAmount,
                    CreditAmount = 0,
                    TransactionDate = bill.BillDate,
                    TransactionSource = "SM Bills",
                    CurrencyId = schoolProfile.CurrencyId,
                    CurrencyName = currencyName,
                    CurrencyCode = currencyCode,
                    BuyRate = buyRate,
                    SellRate = sellRate,
                    BatchNumber = bill.BatchNumber,
                    BatchDate = bill.BillDate,
                    IsPosted = true
                });

                // CREDIT ENTRY
                await _repositoryJournalDetail.InsertAsync(new JournalDetail
                {
                    Id = Guid.NewGuid(),
                    JournalId = journalId,
                    AccountId = acc.CreditGlId,
                    AccountName = creditAccountName,
                    ReferenceNumber = referenceNumber,
                    Description = feeItemName,
                    DebitAmount = 0,
                    CreditAmount = debitAmount,
                    TransactionDate = bill.BillDate,
                    TransactionSource = "SM Bills",
                    CurrencyId = schoolProfile.CurrencyId,
                    CurrencyName = currencyName,
                    CurrencyCode = currencyCode,
                    BuyRate = buyRate,
                    SellRate = sellRate,
                    BatchNumber = bill.BatchNumber,
                    BatchDate = bill.BillDate,
                    IsPosted = true
                });
            }

            journal.TotalDebit = totalDebit;
            journal.TotalCredit = totalCredit;

            bill.IsPosted = true;
            await _billRepository.UpdateAsync(bill);
            
            await _repositoryJournal.InsertAsync(journal);
        }

        return new { code = 200, message = "Payment(s) posted successfully." };
    }
}