using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Abp.Runtime.Session;
using Abp.UI;
using Microsoft.EntityFrameworkCore;
using TopazERP.Authorization.Users;
using TopazERP.DomainServices.SchoolManger.ProcessBills.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.ProcessBills;

public class ProcessBillManager:DomainService, IProcessBillManager
{
    private readonly IRepository<Bill, Guid> _billRepository;
    private readonly IRepository<StudentInfo, Guid> _studentInfoRepository;
    private readonly IRepository<StudentBillInfo, Guid> _studentBillInfoRepository;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<BoardingItem, Guid> _repositoryBoardingItem;
    private readonly IRepository<SupplementaryItem, Guid> _repositorySupplementaryItem;
    private readonly IRepository<FeesDescription, Guid> _repositoryFeesDescription;
    private readonly IRepository<SchBillAccount, Guid> _schBillAccountRepository;
    private readonly IGuidGenerator _guidGenerator;
    public ProcessBillManager(IRepository<Bill, Guid> billRepository, IRepository<StudentBillInfo, Guid> studentBillInfoRepository, IAbpSession abpSession, IRepository<User, long> userRepository, IRepository<StudentInfo, Guid> studentInfoRepository, IRepository<SystemNumber, Guid> repositorySystemNumber, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<BoardingItem, Guid> repositoryBoardingItem, IRepository<SupplementaryItem, Guid> repositorySupplementaryItem, IRepository<FeesDescription, Guid> repositoryFeesDescription, IRepository<SchBillAccount, Guid> schBillAccountRepository, IGuidGenerator guidGenerator)
    {
        _billRepository = billRepository;
        _studentBillInfoRepository = studentBillInfoRepository;
        _abpSession = abpSession;
        _userRepository = userRepository;
        _studentInfoRepository = studentInfoRepository;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositoryBoardingItem = repositoryBoardingItem;
        _repositorySupplementaryItem = repositorySupplementaryItem;
        _repositoryFeesDescription = repositoryFeesDescription;
        _schBillAccountRepository = schBillAccountRepository;
        _guidGenerator = guidGenerator;
    }
    public async Task<string> GenerateBillNumberAsync(Guid academicYearId, Guid termId, Guid classId)
    {
        // Step 1: Check whether a bill number already exists for this academic year and term
        var existingBill = (await _billRepository.GetAll()
            .Where(x => x.AcademicYearId == academicYearId &&
                        x.TermId == termId && x.ClassId == classId)
            .OrderByDescending(x => x.CreationTime)
            .FirstOrDefaultAsync());

        if (existingBill != null)
        {
            return existingBill.BillNumber;
        }

        // Step 2: Get system number
        var systemNumber = await _repositorySystemNumber.FirstOrDefaultAsync(x =>
            x.ItemName == "SM-BillNumbers");

        // Step 3: If no system number exists, generate a random unique number
        if (systemNumber == null)
        {
            var rnd = new Random();

            while (true)
            {
                var randomNumber = rnd.Next(1000, 9999).ToString();

                bool exists = await _billRepository.CountAsync(x => x.BillNumber == randomNumber) > 0;

                if (!exists)
                    return randomNumber;
            }
        }

        // Step 4: Generate the next available bill number
        string number;

        while (true)
        {
            number = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            bool exists = await _billRepository.CountAsync(x => x.BillNumber == number) > 0;

            if (!exists)
                break;

            systemNumber.LastNo++;
        }

        // Step 5: Increment the system number for the next generation
        systemNumber.LastNo++;
        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return number;
    }
    public async Task<string> GenerateBatchNumberAsync(Guid academicYearId, Guid termId, int billingScopeId, int billTypeId, Guid classId, Guid levelId)
    {
    var emptyGuid = Guid.Empty;

    // Boarding bills (type 3) share one batch per year + term
    if (billTypeId == 3)
    {
        var boardingBatch = await _billRepository.FirstOrDefaultAsync(x =>
            x.AcademicYearId == academicYearId &&
            x.TermId == termId &&
            x.BillingScopeId == 0 &&
            x.BillTypeId == 3);

        if (boardingBatch != null)
            return boardingBatch.BatchNumber;
    }
    else
    {
        if (billTypeId is 1 or 2)
        {
            var existingBatch = await _billRepository.FirstOrDefaultAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.BillingScopeId == billingScopeId &&
                x.LevelId == levelId &&
                x.ClassId == classId &&
                (x.BillTypeId == 1 || x.BillTypeId == 2));  // ← only share batch between 1 and 2

            if (existingBatch != null)
                return existingBatch.BatchNumber;
        }
    }

    // --- Generate new batch number ---
    var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
    var systemNumber = systemNumbers.FirstOrDefault(sn => sn.ItemName == "SM-BatchNumbers");

    if (systemNumber == null)
    {
        Random rnd = new Random();
        while (true)
        {
            string randomBatch = rnd.Next(1000, 9999).ToString();
            bool exists = await _billRepository.CountAsync(x => x.BatchNumber == randomBatch) > 0;
            if (!exists) return randomBatch;
        }
    }

    string batchNumber;
    while (true)
    {
        batchNumber = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";
        bool exists = await _billRepository.CountAsync(x => x.BatchNumber == batchNumber) > 0;
        if (!exists) break;
        systemNumber.LastNo++;
    }

    systemNumber.LastNo++;
    await _repositorySystemNumber.UpdateAsync(systemNumber);

    return batchNumber;
}
    public async Task<IEnumerable<object>> ListAllBills()
    {
        var data = await _billRepository.GetAllListAsync();
        return data;
    }
    public async Task<IEnumerable<object>> ListAllStudentBills()
    {
        var data = await _studentBillInfoRepository.GetAllListAsync();
        return data;
    }
    public async Task<object> CreateBill(Bill bill)
    {
        bill.Id = _guidGenerator.Create();
        foreach (var detail in bill.Details)
        {
            detail.BillId = bill.Id;
        }

        foreach (var student in bill.Students)
        {
            student.BillId = bill.Id;
        }
        bill.JournalId = Guid.NewGuid();
        bill.BillNumber = await GenerateBillNumberAsync(bill.AcademicYearId, bill.TermId, bill.ClassId);
        
        bill.BatchNumber = await GenerateBatchNumberAsync(bill.AcademicYearId, bill.TermId, bill.BillingScopeId, bill.BillTypeId, bill.ClassId, bill.LevelId);
        
        await _billRepository.InsertAsync(bill);
        var studentBillInfos = new List<StudentBillInfo>();
        foreach (var student in bill.Students.Where(x => x.ToBeBilled))
        { 
            var studentInfo = await _studentInfoRepository.GetAsync(student.StudentId);
            // update student balance with the amount in billed students
            studentInfo.BalanceDue += student.Amount;
            await _studentInfoRepository.UpdateAsync(studentInfo);
            studentBillInfos.Add(new StudentBillInfo
            {
                Id = student.Id,
                AcademicYearId = bill.AcademicYearId,
                TermId = bill.TermId,
                ClassId = studentInfo.ClassId,
                StudentId = student.StudentId,
                BillNumber = bill.BillNumber,
                BillId = bill.Id,
                BillDate = bill.BillDate,
                Amount = student.Amount,
                AmountPaid = 0,
                BalanceDue = student.Amount,
                BillStatusId = 1,
                TenantId = bill.TenantId
            });
        }
        // insert student bill info records
        foreach (var studentBillInfo in studentBillInfos)            {
            await _studentBillInfoRepository.InsertAsync(studentBillInfo);
        }
        
        return new { code = 200, message = "successful" };
    }
    
    public async Task UpdateBill(Bill bill)
    {
        var existingBill = await _billRepository.GetAllIncluding(
            x => x.Details,
            x => x.Students
        ).FirstOrDefaultAsync(x => x.Id == bill.Id);

        if (existingBill == null)
        {
            throw new UserFriendlyException("Bill not found");
        }

        // Get existing student bill infos
        var existingStudentBillInfos = await _studentBillInfoRepository.GetAllListAsync(
            x => x.BillNumber == existingBill.BillNumber
        );

        // Prevent update if payments already exist
        if (existingStudentBillInfos.Any(x => x.AmountPaid > 0))
        {
            throw new UserFriendlyException(
                "This bill cannot be updated because payments have already been made."
            );
        }

        // Reverse Old Student Balances

        foreach (var oldStudent in existingBill.Students.Where(x => x.ToBeBilled))
        {
            var studentInfo = await _studentInfoRepository.GetAsync(oldStudent.StudentId);

            studentInfo.BalanceDue -= oldStudent.Amount;

            if (studentInfo.BalanceDue < 0)
            {
                studentInfo.BalanceDue = 0;
            }

            await _studentInfoRepository.UpdateAsync(studentInfo);
        }
    

        //Delete Old Student Bill Infos

        foreach (var studentBillInfo in existingStudentBillInfos)
        {
            await _studentBillInfoRepository.DeleteAsync(studentBillInfo);
        }
        /*//Update Bill Header
        existingBill.AcademicYearId = bill.AcademicYearId;
        existingBill.TermId = bill.TermId;
        existingBill.LevelId = bill.LevelId;
        existingBill.ClassId = bill.ClassId;
        existingBill.BillingScopeId = bill.BillingScopeId;
        existingBill.BillDate = bill.BillDate;
        existingBill.BillTypeId = bill.BillTypeId;
        existingBill.BatchNumber = bill.BatchNumber;*/

        //Replace Details

        existingBill.Details.Clear();

        foreach (var detail in bill.Details)
        {
            detail.Id = Guid.NewGuid();
            detail.BillId = existingBill.Id;
            existingBill.Details.Add(detail);
        }

        //Replace Students

        existingBill.Students.Clear();

        foreach (var student in bill.Students)
        {
            student.Id = Guid.NewGuid();
            student.BillId = existingBill.Id;
            existingBill.Students.Add(student);
        }
    

        // Recreate Student Bill Infos And Balances

        var newStudentBillInfos = new List<StudentBillInfo>();

        foreach (var student in bill.Students.Where(x => x.ToBeBilled))
        {
            var studentInfo = await _studentInfoRepository.GetAsync(student.StudentId);

            // Apply new balance
            studentInfo.BalanceDue += student.Amount;

            await _studentInfoRepository.UpdateAsync(studentInfo);

            newStudentBillInfos.Add(new StudentBillInfo
            {
                Id = student.Id,
                AcademicYearId = bill.AcademicYearId,
                TermId = bill.TermId,
                ClassId = studentInfo.ClassId,
                StudentId = student.StudentId,
                BillId = bill.Id,
                BillNumber = bill.BillNumber,
                BillDate = bill.BillDate,
                Amount = student.Amount,
                AmountPaid = 0,
                BalanceDue = student.Amount,
                BillStatusId = 1,
                TenantId = bill.TenantId
            });
        }

        foreach (var studentBillInfo in newStudentBillInfos)
        {
            await _studentBillInfoRepository.InsertAsync(studentBillInfo);
        }
    
        await _billRepository.UpdateAsync(existingBill);
}
   
    
    public async Task DeleteBill(Guid id)
    {
        await _billRepository.DeleteAsync(id);
    }
    
    //process bill
    
    public async Task<object> ProcessMultipleBills(List<Bill> bills)
    {
        
        var studentBillInfos = new List<StudentBillInfo>();
        foreach (var bill in bills)
        {foreach (var detail in bill.Details)
            {
                detail.BillId = bill.Id;
            }

            foreach (var student in bill.Students)
            {
                student.BillId = bill.Id;
            }
            bill.JournalId = Guid.NewGuid();
           
            bill.BatchNumber = await GenerateBatchNumberAsync(bill.AcademicYearId, bill.TermId, bill.BillingScopeId, bill.BillTypeId, bill.ClassId, bill.LevelId);
            await _billRepository.InsertAsync(bill);
         
            foreach (var student in bill.Students.Where(x => x.ToBeBilled))
            { 
                var studentInfo = await _studentInfoRepository.GetAsync(student.StudentId);
                // update student balance with the amount in billed students
                studentInfo.BalanceDue += student.Amount;
                await _studentInfoRepository.UpdateAsync(studentInfo);
                studentBillInfos.Add(new StudentBillInfo
                {
                    Id = student.Id,
                    AcademicYearId = bill.AcademicYearId,
                    TermId = bill.TermId,
                    ClassId = bill.ClassId,
                    StudentId = student.StudentId,
                    BillNumber = bill.BillNumber,
                    BillDate = bill.BillDate,
                    Amount = student.Amount,
                    AmountPaid = 0,
                    BalanceDue = student.Amount,
                    BillStatusId = 1,
                    TenantId = bill.TenantId
                });
                
            }
            foreach (var studentBillInfo in studentBillInfos)            {
                await _studentBillInfoRepository.InsertAsync(studentBillInfo);
            }
        }
        return new { code = 200, message = "successful" };
    }

    //cancel bill
    public async Task<object> CancelBill(Guid id)
    {
        var bill = await _billRepository.GetAsync(id);
        if (bill == null)
        {
            return new { code = 404, message = "Bill not found" };
        }

        bill.IsCancelled = true;
        bill.IsPosted = false;
        bill.IsProcessed = false;
        bill.CanceledDate = DateTime.Now;
        string canceledByName = "Unknown";
        if (_abpSession.UserId.HasValue)
        {
            var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
            canceledByName = user != null ? user.Name : "Unknown";
        }
        bill.CanceledBy = canceledByName;
        foreach (var student in bill.Students)
        { 
            var studentInfo = await _studentInfoRepository.GetAsync(student.StudentId);
            // remove the billed amount from student balance
            studentInfo.BalanceDue -= student.Amount;
            await _studentInfoRepository.UpdateAsync(studentInfo);
            
            // remove the student bill info record for this bill and student
            var studentBillInfo = await _studentBillInfoRepository.FirstOrDefaultAsync(x => x.BillNumber == bill.BillNumber && x.StudentId == student.StudentId);
            if (studentBillInfo != null)
            {
                studentBillInfo.IsCanceled = true;
                studentBillInfo.CanceledBy = canceledByName;
                await _studentBillInfoRepository.UpdateAsync(studentBillInfo);
            }
        }
        if (bill.IsPosted)
        {
            // Delete Journal Details first
            var journalDetails = await _repositoryJournalDetail
                .GetAllListAsync(x => x.JournalId == bill.JournalId);

            foreach (var detail in journalDetails)
            {
                await _repositoryJournalDetail.DeleteAsync(detail);
            }

            // Delete Journal
            var journal = await _repositoryJournal
                .FirstOrDefaultAsync(x => x.Id == bill.JournalId && x.TransactionSource == "SM");

            if (journal != null)
            {
                await _repositoryJournal.DeleteAsync(journal);
            }
        }
        await _billRepository.UpdateAsync(bill);

        return new { code = 200, message = "successful" };
    }
    
    public async Task<object> CancelMultipleBills(List<Guid> billIds)
{
    if (!billIds.Any())
        return new { code = 400, message = "No bills selected." };

    var selectedBills = await _billRepository.GetAllListAsync(x => billIds.Contains(x.Id));

    if (!selectedBills.Any())
        return new { code = 404, message = "Bills not found." };

    // Resolve the cancelling user once, outside the loop
    string canceledByName = "Unknown";
    if (_abpSession.UserId.HasValue)
    {
        var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
        canceledByName = user?.Name ?? "Unknown";
    }

    foreach (var bill in selectedBills)
    {
        // Skip already-cancelled bills
        if (bill.IsCancelled) continue;
        if (bill.IsPosted)
        {
            // Delete Journal Details first
            var journalDetails = await _repositoryJournalDetail
                .GetAllListAsync(x => x.JournalId == bill.JournalId);

            foreach (var detail in journalDetails)
            {
                await _repositoryJournalDetail.DeleteAsync(detail);
            }

            // Delete Journal
            var journal = await _repositoryJournal
                .FirstOrDefaultAsync(x => x.Id == bill.JournalId && x.TransactionSource == "SM");

            if (journal != null)
            {
                await _repositoryJournal.DeleteAsync(journal);
            }
        }
        bill.IsCancelled = true;
        bill.IsProcessed = false;
        bill.IsPosted = false;
        bill.CanceledDate = DateTime.Now;
        bill.CanceledBy = canceledByName;

        // Only process students actually listed in this bill
        if (bill.Students == null || !bill.Students.Any())
        {
            await _billRepository.UpdateAsync(bill);
            continue;
        }

        foreach (var billedStudent in bill.Students)
        {
            var studentInfo = await _studentInfoRepository
                .FirstOrDefaultAsync(x => x.Id == billedStudent.StudentId);

            if (studentInfo == null) continue;

            // Reverse the billed amount — cancelling means student no longer owes this
            studentInfo.BalanceDue -= billedStudent.Amount;

            await _studentInfoRepository.UpdateAsync(studentInfo);

            // Remove the StudentBillInfo record linked to this bill + student
            var studentBillInfo = await _studentBillInfoRepository
                .FirstOrDefaultAsync(x => x.Id == billedStudent.Id);

            if (studentBillInfo == null) continue;
            studentBillInfo.IsCanceled = true;
            studentBillInfo.CanceledBy = canceledByName;
            await _studentBillInfoRepository.UpdateAsync(studentBillInfo);

        }

        await _billRepository.UpdateAsync(bill);
    }

    return new { code = 200, message = "Bill(s) cancelled successfully." };
}
    
  
    public async Task<object> CancelBillsForStudents(List<Guid> studentBillInfoIds)
    {
        var studentBillInfos = await _studentBillInfoRepository
            .GetAllListAsync(x => 
                studentBillInfoIds.Contains(x.Id));

        if (!studentBillInfos.Any())
        {
            return new
            {
                code = 404,
                message = "No billed records found for selected students."
            };
        }
        
        var billIds = studentBillInfos
            .Select(x => x.BillId)
            .Distinct()
            .ToList();

        
        var studentIds = studentBillInfos
            .Select(x => x.StudentId)
            .Distinct()
            .ToList();

        var bills = await _billRepository
            .GetAllListAsync(x => billIds.Contains(x.Id));
        /*var bills = await _billRepository
            .GetAllListAsync(x => billNumbers.Contains(x.BillNumber));*/

        var students = await _studentInfoRepository
            .GetAllListAsync(x => studentIds.Contains(x.Id));
        var feeItems = await _repositoryFeesDescription.GetAllListAsync();
        var supplementaryItems = await _repositorySupplementaryItem.GetAllListAsync();
        var boardingItems = await _repositoryBoardingItem.GetAllListAsync();

        var feeItemMap = feeItems.ToDictionary(x => x.Id, x => x.Description);
        var supplementaryMap = supplementaryItems.ToDictionary(x => x.Id, x => x.Name);
        var boardingMap = boardingItems.ToDictionary(x => x.Id, x => x.Name);
        string canceledByName = "Unknown";

        if (_abpSession.UserId.HasValue)
        {
            var user = await _userRepository
                .FirstOrDefaultAsync(_abpSession.UserId.Value);

            canceledByName = user?.Name ?? "Unknown";
        }

        foreach (var studentBillInfo in studentBillInfos)
        {
            var bill = bills.FirstOrDefault(x =>
                x.Id == studentBillInfo.BillId);

            if (bill == null || bill.Students == null)
                continue;

            var billedStudent = bill.Students
                .FirstOrDefault(x => x.Id == studentBillInfo.Id);

            if (billedStudent == null)
                continue;

            if (!billedStudent.ToBeBilled)
                continue;

            billedStudent.ToBeBilled = false;

            // =========================
            // 1. UPDATE STUDENT BALANCE
            // =========================
            var student = students.FirstOrDefault(x =>
                x.Id == studentBillInfo.StudentId);

            if (student != null)
            {
                student.BalanceDue -= billedStudent.Amount;
                await _studentInfoRepository.UpdateAsync(student);
            }

            // =========================
            // 2. ADJUST JOURNAL
            // =========================
           // Load account map (same as PostBills)
        var billAccounts = await _schBillAccountRepository.GetAllListAsync();
        var accountMap = billAccounts
            .ToDictionary(x => (x.BillTypeId, x.FeeItemId), x => x);

        // Then inside the foreach (var studentBillInfo in studentBillInfos) loop:

        if (bill.IsPosted && bill.JournalId != Guid.Empty)
        {
            var journal = await _repositoryJournal
                .FirstOrDefaultAsync(x => x.Id == bill.JournalId && x.TransactionSource == "SM");
            

            var allJournalDetails = await _repositoryJournalDetail
                .GetAllListAsync(x => x.JournalId == bill.JournalId);

            foreach (var detail in bill.Details)
            {
                if (!accountMap.TryGetValue((bill.BillTypeId, detail.FeeItemId), out var acc))
                    continue;

                var feeItemName = "Unknown Fee Item";

                if (bill.BillTypeId == 1)
                    feeItemMap.TryGetValue(detail.FeeItemId, out feeItemName);
                else if (bill.BillTypeId == 2)
                    supplementaryMap.TryGetValue(detail.FeeItemId, out feeItemName);
                else if (bill.BillTypeId == 3)
                    boardingMap.TryGetValue(detail.FeeItemId, out feeItemName);

                // detail.Amount is the per-student amount for this fee line
                var perStudentFeeAmount = detail.Amount;

                var debitLine = allJournalDetails
                    .FirstOrDefault(x => 
                        x.AccountId == acc.DebitGlId && 
                        x.DebitAmount > 0 &&
                        x.Description == feeItemName &&
                        x.BatchNumber == bill.BatchNumber);

                var creditLine = allJournalDetails
                    .FirstOrDefault(x => 
                        x.AccountId == acc.CreditGlId && 
                        x.CreditAmount > 0 &&
                        x.Description == feeItemName &&
                        x.BatchNumber == bill.BatchNumber);

                if (debitLine != null)
                {
                    debitLine.DebitAmount -= perStudentFeeAmount;
                    /*if (debitLine.DebitAmount < 0) debitLine.DebitAmount = 0;
                    await _repositoryJournalDetail.UpdateAsync(debitLine);*/
                    if (debitLine.DebitAmount <= 0) 
                    { 
                        // Amount has been completely cancelled,
                        // so remove the journal detail record.
                      await _repositoryJournalDetail.DeleteAsync(debitLine); 
                    } else 
                    { 
                        // Some amount is still remaining,
                        // so update the existing journal detail.
                        await _repositoryJournalDetail.UpdateAsync(debitLine);
                        
                    }
                }

                if (creditLine != null)
                {
                    creditLine.CreditAmount -= perStudentFeeAmount;
                    /*if (creditLine.CreditAmount < 0) creditLine.CreditAmount = 0;
                    await _repositoryJournalDetail.UpdateAsync(creditLine);*/
                    if (creditLine.CreditAmount <= 0) 
                    { 
                        // Amount has been completely cancelled,
                        // so remove the journal detail record.
                        await _repositoryJournalDetail.DeleteAsync(creditLine); 
                    } else 
                    { 
                        // Some amount is still remaining,
                        // so update the existing journal detail.
                        await _repositoryJournalDetail.UpdateAsync(creditLine);
                        
                    }
                }
            }
            
            if (journal != null)
            {
                journal.TotalDebit -= billedStudent.Amount;
                journal.TotalCredit -= billedStudent.Amount;

                // Prevent negative totals
                if (journal.TotalDebit < 0) journal.TotalDebit = 0;
                if (journal.TotalCredit < 0) journal.TotalCredit = 0;
                
                // If both debit and credit are now zero,
                // there is no accounting value left in the journal.
                // Delete the journal record completely.
                if (journal.TotalDebit == 0 && journal.TotalCredit == 0)
                {
                    await _repositoryJournal.DeleteAsync(journal);
                } 
                else
                { 
                    // Otherwise, update the remaining journal balance.
                    await _repositoryJournal.UpdateAsync(journal); 
                }
            }
        }

            // =========================
            // 3. DELETE BILL LINK RECORD
            // =========================
            studentBillInfo.IsCanceled = true;
            studentBillInfo.CanceledBy = canceledByName;
            await _studentBillInfoRepository.UpdateAsync(studentBillInfo);

           
        }
// =========================
// CHECK IF ENTIRE BILL IS CANCELLED
// =========================

        foreach (var bill in bills)
        {
            var allStudentBillInfos = await _studentBillInfoRepository
                .GetAllListAsync(x => x.BillId == bill.Id);


            // If every student linked to this bill is cancelled
            if (allStudentBillInfos.All(x => x.IsCanceled))
            {
                bill.IsCancelled = true;
                bill.IsProcessed = false;
                bill.IsPosted = false;
                bill.CanceledDate = DateTime.Now;
                bill.CanceledBy = canceledByName;

                await _billRepository.UpdateAsync(bill);
            }
        }
        return new
        {
            code = 200,
            message = "Student billing cancelled successfully."
        };
    }
    public async Task<bool> CheckExistingBill(CheckExistingBillDto input)
    {
        if (input == null)
            return false;

        var bills = await _billRepository.GetAll()
            .Where(x =>
                x.AcademicYearId == input.AcademicYearId &&
                x.TermId == input.TermId &&
                x.BillTypeId == input.BillTypeId &&
                x.ClassId == input.ClassId &&
                !x.IsCancelled &&
                !x.IsDeleted)
            .ToListAsync();

        // Supplementary Bills
        if (input.BillTypeId == 2)
        {
            if (input.FeeItemId == null || input.FeeItemId == Guid.Empty)
                return false;

            return bills.Any(x =>
                x.ClassId == input.ClassId &&
                x.Details != null &&
                x.Details.Any(d => d.FeeItemId == input.FeeItemId));
        }

        // Standard & Global Bills
        return bills.Any(x => x.ClassId == input.ClassId);
    }
    
}