using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Abp.Domain.Uow;
using Abp.Runtime.Session;
using TopazERP.Authorization.Users;
using TopazERP.Models.Ledger;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.CreditMemos;

public class CreditMemoManager:DomainService, ICreditMemoManager
{
    private readonly IRepository<SchCreditMemo, Guid> _repositoryMemo;
    private readonly IRepository<StudentInfo, Guid> _studentInfoRepository;
    private readonly IRepository<StudentBillInfo, Guid> _studentBillInfoRepository;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;
    private readonly IUnitOfWorkManager _unitOfWorkManager;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    public CreditMemoManager(IRepository<SchCreditMemo, Guid> repositoryMemo, IRepository<StudentInfo, Guid> studentInfoRepository, IRepository<StudentBillInfo, Guid> studentBillInfoRepository, IAbpSession abpSession, IRepository<User, long> userRepository, IUnitOfWorkManager unitOfWorkManager, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail)
    {
        _repositoryMemo = repositoryMemo;
        _studentInfoRepository = studentInfoRepository;
        _studentBillInfoRepository = studentBillInfoRepository;
        _abpSession = abpSession;
        _userRepository = userRepository;
        _unitOfWorkManager = unitOfWorkManager;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
    }
    public async Task<object> Create(SchCreditMemo entity)
    {
        entity.BatchNumber = await GenerateBatchNumberAsync();
        entity.ReceiptNumber = await GenerateReceiptNumberAsync();
        entity.IsProcessed = true;
        entity.JournalId = Guid.NewGuid();
        await _repositoryMemo.InsertAsync(entity);

        var amount = entity.AmountToCredit;
        var rate = entity.Rate <= 0 ? 1 : entity.Rate;

        var convertedAmount = entity.IsMultiCurrency
            ? amount * rate
            : amount;
        
            var studentInfo = await _studentInfoRepository
                .FirstOrDefaultAsync(x => x.Id == entity.StudentId);

            if (studentInfo != null)
            {
                studentInfo.BalanceDue -= convertedAmount;
                await _studentInfoRepository.UpdateAsync(studentInfo);
            }
        return new { code = 200, message = "successful" };
    }
    public async Task<object> CreateMultiple(List<SchCreditMemo> entities)
    {
        if (entities == null || !entities.Any())
            return new { code = 400, message = "No data provided" };

        using (var uow = _unitOfWorkManager.Begin())
        {
            foreach (var entity in entities)
            {
                entity.BatchNumber = await GenerateBatchNumberAsync();
                entity.ReceiptNumber = await GenerateReceiptNumberAsync();
                entity.IsProcessed = true;
                entity.JournalId = Guid.NewGuid();
                await _repositoryMemo.InsertAsync(entity);

                var studentInfo = await _studentInfoRepository
                    .FirstOrDefaultAsync(x => x.Id == entity.StudentId);

                if (studentInfo == null) continue;

                var amount = entity.AmountToCredit;
                var rate = entity.Rate <= 0 ? 1 : entity.Rate;

                var convertedAmount = entity.IsMultiCurrency
                    ? amount * rate
                    : amount;

                studentInfo.BalanceDue -= convertedAmount;

                await _studentInfoRepository.UpdateAsync(studentInfo);
            }

            await uow.CompleteAsync();
        }

        return new { code = 200, message = "successful" };
    }
    public async Task Update(SchCreditMemo entity)
    {
        var existing = await _repositoryMemo.GetAsync(entity.Id);

        var oldRate = existing.Rate <= 0 ? 1 : existing.Rate;
        var newRate = entity.Rate <= 0 ? 1 : entity.Rate;

        var oldConverted = existing.IsMultiCurrency
            ? existing.AmountToCredit * oldRate
            : existing.AmountToCredit;
        
        var newConverted = entity.IsMultiCurrency
            ? entity.AmountToCredit * newRate
            : entity.AmountToCredit;

        var difference = newConverted - oldConverted;
        
        
            var studentInfo = await _studentInfoRepository
                .FirstOrDefaultAsync(x => x.Id == existing.StudentId);

            if (studentInfo != null)
            {
                studentInfo.BalanceDue -= difference;
                await _studentInfoRepository.UpdateAsync(studentInfo);
            }

        // -----------------------------
        // UPDATE MEMO RECORD
        // -----------------------------
        existing.AmountToCredit = entity.AmountToCredit;
        existing.Rate = entity.Rate;
        existing.IsMultiCurrency = entity.IsMultiCurrency;
        existing.Description = entity.Description;
        existing.StudentId = entity.StudentId;
        existing.ClassId = entity.ClassId;
        existing.Date = entity.Date;
        existing.PaymentMethod = entity.PaymentMethod;
        existing.BankId = entity.BankId;
        existing.BankBranchId = entity.BankBranchId;
        existing.ChequeNumber = entity.ChequeNumber;
        existing.ChequeDate = entity.ChequeDate;
        existing.CurrencyId = entity.CurrencyId;
        existing.Rate = entity.Rate;

        await _repositoryMemo.UpdateAsync(existing);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryMemo.GetAllListAsync();
        return data;
    }

    public async Task Delete(Guid id)
    {
        await _repositoryMemo.DeleteAsync(id);
    }
    

    public async Task<object> CancelMemos(List<Guid> memoIds)
    {
    if (!memoIds.Any())
        return new { code = 400, message = "No payments selected." };

    var selectedPayments = await _repositoryMemo.GetAllListAsync(x => memoIds.Contains(x.Id));

    if (!selectedPayments.Any())
        return new { code = 404, message = "Payments not found." };

    // Resolve the cancelling user once, outside the loop
    string canceledByName = "Unknown";
    if (_abpSession.UserId.HasValue)
    {
        var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
        canceledByName = user?.Name ?? "Unknown";
    }

    foreach (var payment in selectedPayments)
    {
        // Skip already-cancelled payments
        if (payment.IsCanceled) continue;
        if (payment.IsProcessed)
        {
            var studentInfo = await _studentInfoRepository.FirstOrDefaultAsync(x => x.Id == payment.StudentId);
            if (studentInfo == null) continue;
            var amountToPaid = payment.AmountToCredit;
            var buyRate = payment.Rate <= 0 ? 1 : payment.Rate;

            var convertedAmount = payment.IsMultiCurrency
                ? amountToPaid * buyRate
                : amountToPaid;

            studentInfo.BalanceDue += convertedAmount;
            await _studentInfoRepository.UpdateAsync(studentInfo);
           
        }
        if (payment.IsPosted)
        {
            // Delete Journal Details first
            var journalDetails = await _repositoryJournalDetail
                .GetAllListAsync(x => x.JournalId == payment.JournalId);

            foreach (var detail in journalDetails)
            {
                await _repositoryJournalDetail.DeleteAsync(detail);
            }

            // Delete Journal
            var journal = await _repositoryJournal
                .FirstOrDefaultAsync(x => x.Id == payment.JournalId && x.TransactionSource == "SM");

            if (journal != null)
            {
                await _repositoryJournal.DeleteAsync(journal);
            }
        }
        payment.IsCanceled = true;
        payment.IsProcessed = false;
        payment.IsPosted = false;
        payment.CanceledDate = DateTime.Now;
        payment.CanceledBy = canceledByName;

        
        
        await _repositoryMemo.UpdateAsync(payment);
    }

    return new { code = 200, message = "Credit Memo(s) cancelled successfully." };
}
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "SM-BatchNumbers");

        // If no system number exists, generate a random batch number as fallback
        if (systemNumber == null)
        {
            string randomBatch;
            Random rnd = new Random();

            while (true)
            {
                randomBatch = rnd.Next(1000, 9999).ToString();
                bool exists = await _repositoryMemo.CountAsync(x => x.BatchNumber == randomBatch) > 0;

                if (!exists)
                    return randomBatch;
            }
        }
        string batchNumber;
        // Generate the next available batch number
        while (true)
        {
            batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _repositoryMemo.CountAsync(x => x.BatchNumber == batchNumber) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++; // ONLY increment here if the number exists
        }
        // Increment ONCE after choosing the batch number
        systemNumber.LastNo++;
        await _repositorySystemNumber.UpdateAsync(systemNumber);
        return batchNumber;
    }
    public async Task<string> GenerateReceiptNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "SM-ReceiptNumbers");

        // If no system number exists, generate a random batch number as fallback
        if (systemNumber == null)
        {
            string randomNumber;
            Random rnd = new Random();

            while (true)
            {
                randomNumber = rnd.Next(1000, 9999).ToString();
                bool exists = await _repositoryMemo.CountAsync(x => x.ReceiptNumber == randomNumber) > 0;

                if (!exists)
                    return randomNumber;
            }
        }
        string number;
        // Generate the next available batch number
        while (true)
        {
            number = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _repositoryMemo.CountAsync(x => x.ReceiptNumber == number) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++; // ONLY increment here if the number exists
        }
        // Increment ONCE after choosing the batch number
        systemNumber.LastNo++;
        await _repositorySystemNumber.UpdateAsync(systemNumber);
        return number;
    }
}