using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Abp.Runtime.Session;
using TopazERP.Authorization.Users;
using TopazERP.Models.Ledger;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.Payments;

public class PaymentManager:DomainService,IPaymentManager
{
    private readonly IRepository<SchPayment, Guid> _repositoryPayment;
    private readonly IRepository<StudentInfo, Guid> _studentInfoRepository;
    private readonly IRepository<StudentBillInfo, Guid> _studentBillInfoRepository;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    public PaymentManager(IRepository<SchPayment, Guid> repositoryPayment, IRepository<StudentInfo, Guid> studentInfoRepository, IRepository<StudentBillInfo, Guid> studentBillInfoRepository, IAbpSession abpSession, IRepository<User, long> userRepository, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail)
    {
        _repositoryPayment = repositoryPayment;
        _studentInfoRepository = studentInfoRepository;
        _studentBillInfoRepository = studentBillInfoRepository;
        _abpSession = abpSession;
        _userRepository = userRepository;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
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
                bool exists = await _repositoryPayment.CountAsync(x => x.ReceiptNumber == randomNumber) > 0;

                if (!exists)
                    return randomNumber;
            }
        }
        string number;
        // Generate the next available batch number
        while (true)
        {
            number = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _repositoryPayment.CountAsync(x => x.ReceiptNumber == number) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++; // ONLY increment here if the number exists
        }
        // Increment ONCE after choosing the batch number
        systemNumber.LastNo++;
        await _repositorySystemNumber.UpdateAsync(systemNumber);
        return number;
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers
            .FirstOrDefault(sn => sn.ItemName == "SM-BatchNumbers");

        // If no system number exists, generate a random batch number as fallback
        if (systemNumber == null)
        {
            string randomNumber;
            Random rnd = new Random();

            while (true)
            {
                randomNumber = rnd.Next(1000, 9999).ToString();
                bool exists = await _repositoryPayment.CountAsync(x => x.BatchNumber == randomNumber) > 0;

                if (!exists)
                    return randomNumber;
            }
        }
        string number;
        // Generate the next available batch number
        while (true)
        {
            number = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _repositoryPayment.CountAsync(x => x.BatchNumber == number) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++; // ONLY increment here if the number exists
        }
        // Increment ONCE after choosing the batch number
        systemNumber.LastNo++;
        await _repositorySystemNumber.UpdateAsync(systemNumber);
        return number;
    }
    public async Task<object> Create(SchPayment entity)
    {
        entity.ReceiptNumber = await GenerateReceiptNumberAsync();
        entity.BatchNumber = await GenerateBatchNumberAsync();
        entity.JournalId = Guid.NewGuid();

        var payment = await _repositoryPayment.InsertAsync(entity);

        return new
        {
            code = 200,
            message = "successful",
            id = payment.Id,
            studentId = payment.StudentId,
        };
    }

    public async Task Update(SchPayment entity)
    {
        await _repositoryPayment.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryPayment.GetAllListAsync();
        return data;
    }

    public async Task Delete(Guid id)
    {
        await _repositoryPayment.DeleteAsync(id);
    }
    
    public async Task<object> CancelPayments(List<Guid> paymentIds)
    {
    if (!paymentIds.Any())
        return new { code = 400, message = "No payments selected." };

    var selectedPayments = await _repositoryPayment.GetAllListAsync(x => paymentIds.Contains(x.Id));

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
            var amountToPaid = payment.AmountToPaid;
            var buyRate = payment.BuyRate <= 0 ? 1 : payment.BuyRate;

            var convertedAmount = payment.IsMultiCurrency
                ? amountToPaid * buyRate
                : amountToPaid;

            studentInfo.BalanceDue -= convertedAmount;
            
            var studentBills = await _studentBillInfoRepository.GetAllListAsync(x =>
                x.StudentId == payment.StudentId &&
                x.AcademicYearId == payment.AcademicYearId &&
                x.TermId == payment.TermId &&
                !x.IsCanceled);

            if (studentBills.Any())
            {
                decimal totalBillAmount = studentBills.Sum(x => x.Amount);

                if (totalBillAmount > 0)
                {
                    foreach (var bill in studentBills)
                    {
                        decimal percentage = bill.Amount / totalBillAmount;

                        decimal allocatedAmount = Math.Round(convertedAmount * percentage, 2);

                        bill.AmountPaid -= allocatedAmount;

                        if (bill.AmountPaid < 0)
                            bill.AmountPaid = 0;

                        bill.BalanceDue = bill.Amount - bill.AmountPaid;

                        if (bill.AmountPaid == 0)
                        {
                            bill.BillStatusId = 1;
                        }
                        else if (bill.AmountPaid < bill.Amount)
                        {
                            bill.BillStatusId = 2;
                        }
                        else
                        {
                            bill.BillStatusId = 3;
                        }

                        await _studentBillInfoRepository.UpdateAsync(bill);
                    }
                }
            }
            
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

        
        
        await _repositoryPayment.UpdateAsync(payment);
    }

    return new { code = 200, message = "Payments(s) cancelled successfully." };
}
    public async Task<object> ProcessPayments(List<Guid> paymentIds)
    {
        if (!paymentIds.Any())
            return new { code = 400, message = "No payments selected." };

        var selectedPayments = await _repositoryPayment.GetAllListAsync(x => paymentIds.Contains(x.Id));

        if (!selectedPayments.Any())
            return new { code = 404, message = "Payments not found." };
        
        foreach (var payment in selectedPayments)
        {
            if (payment.IsProcessed)
                continue;

            payment.IsProcessed = true;

            var studentInfo = await _studentInfoRepository
                .FirstOrDefaultAsync(x => x.Id == payment.StudentId);

            if (studentInfo == null)
                continue;

            var amountToPaid = payment.AmountToPaid;
            var buyRate = payment.BuyRate <= 0 ? 1 : payment.BuyRate;

            var convertedAmount = payment.IsMultiCurrency
                ? amountToPaid * buyRate
                : amountToPaid;

            studentInfo.BalanceDue -= convertedAmount;
            payment.Balance = studentInfo.BalanceDue;
            
            var studentBills = await _studentBillInfoRepository.GetAllListAsync(x =>
                x.StudentId == payment.StudentId &&
                x.AcademicYearId == payment.AcademicYearId &&
                x.TermId == payment.TermId &&
                !x.IsCanceled);

            if (studentBills.Any())
            {
                decimal totalBillAmount = studentBills.Sum(x => x.Amount);

                if (totalBillAmount > 0)
                {
                    foreach (var bill in studentBills)
                    {
                        decimal percentage = bill.Amount / totalBillAmount;

                        decimal allocatedAmount = Math.Round(convertedAmount * percentage, 2);

                        bill.AmountPaid += allocatedAmount;
                        bill.BalanceDue = bill.Amount - bill.AmountPaid;

                        if (bill.AmountPaid <= 0)
                        {
                            bill.BillStatusId = 1;
                        }
                        else if (bill.AmountPaid < bill.Amount)
                        {
                            bill.BillStatusId = 2;
                        }
                        else
                        {
                            bill.AmountPaid = bill.Amount;
                            bill.BalanceDue = 0;
                            bill.BillStatusId = 3;
                        }

                        await _studentBillInfoRepository.UpdateAsync(bill);
                    }
                }
            }

            await _studentInfoRepository.UpdateAsync(studentInfo);
            await _repositoryPayment.UpdateAsync(payment);
        }
        return new { code = 200, message = "Payment(s) processed successfully." };
    }
    
}