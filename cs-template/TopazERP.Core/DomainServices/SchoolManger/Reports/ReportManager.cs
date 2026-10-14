using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Abp.Runtime.Session;
using Abp.UI;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using TopazERP.Authorization.Users;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;
using TopazERP.DomainServices.SchoolManger.Email;
using TopazERP.DomainServices.SchoolManger.Reports.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;
using Stream = TopazERP.Models.Sch.Stream;

namespace TopazERP.DomainServices.SchoolManger.Reports;

public class ReportManager:DomainService,IReportManager
{
    private readonly IRepository<SchoolProfile, Guid> _schoolProfileRepository;
    private readonly IRepository<ClassAssignment, Guid> _classAssignmentRepository;
    private readonly IAbpSession _abpSession;
    private readonly IRepository<User, long> _userRepository;
    private readonly IRepository<Class, Guid> _classRepository;
    private readonly IRepository<Stream, Guid> _streamRepository;
    private readonly IRepository<LevelClass, Guid> _levelClassRepository;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
    private readonly IRepository<Bill, Guid> _billRepository;
    private readonly IRepository<SchPayment, Guid> _repositoryPayment;
    private readonly IRepository<SchCreditMemo, Guid> _repositoryMemo;
    private readonly IRepository<StudentBillInfo, Guid> _studentBillInfoRepository;
    private readonly IRepository<StudentOpeningBalance, Guid> _studentOpeningBalanceRepository;
    private readonly IRepository<StudentInfo, Guid> _studentInfoRepository;
    private readonly IRepository<AcademicYear, Guid> _academicYearRepository;
    private readonly IRepository<City, Guid> _cityRepository;
    private readonly ISmEmailManager _smEmailManager; 
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly IRepository<LevelClass, Guid> _levelClassRepo;
    private readonly IRepository<Currency, Guid> _currencyRepository;
    private readonly IRepository<FeesDescription, Guid> _standardFeeItemRepository;
    private readonly IRepository<BoardingItem, Guid> _boardingItemRepository;
    private readonly IRepository<SupplementaryItem, Guid> _supItemRepository;
    private readonly IRepository<BillFooter, Guid> _billFooterRepository;
    private readonly IRepository<Bank, Guid> _bankRepository;
    private readonly IRepository<FeeSetUp, Guid> _feeSetUpRepository;
    private readonly IRepository<BoardingFee, Guid> _boardingFeeSetUpRepository;
    private readonly IRepository<StudentOpeningBalance, Guid> _balances;
    private readonly IRepository<SchCreditMemo, Guid> _schCreditMemoRepository;
    
    
    public ReportManager(IRepository<SchoolProfile, Guid> schoolProfileRepository, IRepository<ClassAssignment, Guid> classAssignmentRepository, IAbpSession abpSession, IRepository<User, long> userRepository, IRepository<Class, Guid> classRepository, IRepository<Stream, Guid> streamRepository, IRepository<LevelClass, Guid> levelClassRepository, IRepository<Journal, Guid> repositoryJournal, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<Bill, Guid> billRepository, IRepository<SchPayment, Guid> repositoryPayment, IRepository<SchCreditMemo, Guid> repositoryMemo, IRepository<StudentBillInfo, Guid> studentBillInfoRepository, IRepository<StudentOpeningBalance, Guid> studentOpeningBalanceRepository, IRepository<StudentInfo, Guid> studentInfoRepository, IRepository<AcademicYear, Guid> academicYearRepository, IWebHostEnvironment webHostEnvironment, IRepository<City, Guid> cityRepository, ISmEmailManager smEmailManager, IRepository<LevelClass, Guid> levelClassRepo, IRepository<Currency, Guid> currencyRepository, IRepository<FeesDescription, Guid> standardFeeItemRepository, IRepository<BoardingItem, Guid> boardingItemRepository, IRepository<SupplementaryItem, Guid> supItemRepository, IRepository<BillFooter, Guid> billFooterRepository, IRepository<Bank, Guid> bankRepository, IRepository<FeeSetUp, Guid> feeSetUpRepository, IRepository<BoardingFee, Guid> boardingFeeSetUpRepository, IRepository<StudentOpeningBalance, Guid> balances, IRepository<SchCreditMemo, Guid> schCreditMemoRepository)
    {
        _schoolProfileRepository = schoolProfileRepository;
        _classAssignmentRepository = classAssignmentRepository;
        _abpSession = abpSession;
        _userRepository = userRepository;
        _classRepository = classRepository;
        _streamRepository = streamRepository;
        _levelClassRepository = levelClassRepository;
        _repositoryJournal = repositoryJournal;
        _repositoryJournalDetail = repositoryJournalDetail;
        _billRepository = billRepository;
        _repositoryPayment = repositoryPayment;
        _repositoryMemo = repositoryMemo;
        _studentBillInfoRepository = studentBillInfoRepository;
        _studentOpeningBalanceRepository = studentOpeningBalanceRepository;
        _studentInfoRepository = studentInfoRepository;
        _academicYearRepository = academicYearRepository;
        _webHostEnvironment = webHostEnvironment;
        _cityRepository = cityRepository;
        _smEmailManager = smEmailManager;
        _levelClassRepo = levelClassRepo;
        _currencyRepository = currencyRepository;
        _standardFeeItemRepository = standardFeeItemRepository;
        _boardingItemRepository = boardingItemRepository;
        _supItemRepository = supItemRepository;
        _billFooterRepository = billFooterRepository;
        _bankRepository = bankRepository;
        _feeSetUpRepository = feeSetUpRepository;
        _boardingFeeSetUpRepository = boardingFeeSetUpRepository;
        _balances = balances;
        _schCreditMemoRepository = schCreditMemoRepository;
    }

    public async Task<object> GetReportHeader(string title)
    {
        var data = await _schoolProfileRepository.GetAllListAsync();
        var currencies = await _currencyRepository.GetAllListAsync();
        return data.Select(a => new
        {
            a.SchoolName,
            PhoneNo = $"Tel: {a.PhoneNo}",
            a.Address,
            Email = $"Email: {a.Email}",
            a.CompanyLogo,
            a.Signature,
            a.SchoolLogo,
            a.SignatureUrl,
            Title = title,
            CurrencyName = currencies.FirstOrDefault(c => c.Id == a.CurrencyId)?.CurrencyName ?? ""
        }).ToList();
    }

    //get canceled assignments
    public async Task<object> GetCanceledAssignments(Guid academicYearId, Guid termId)
    {
        var assignments = await _classAssignmentRepository.GetAllListAsync(a =>
            a.IsCanceled &&
            a.AcademicYearId == academicYearId &&
            a.TermId == termId
        );

        var levelClasses = await _levelClassRepository.GetAllListAsync();
        var classes = await _classRepository.GetAllListAsync();
        var streams = await _streamRepository.GetAllListAsync();

        // Only load users we actually need
        var userIds = assignments
            .Where(a => a.LastModifierUserId.HasValue)
            .Select(a => a.LastModifierUserId.Value)
            .Distinct()
            .ToList();

        var users = userIds.Count == 0
            ? new System.Collections.Generic.List<User>()
            : await _userRepository.GetAllListAsync(u => userIds.Contains(u.Id));

        var result = assignments.Select(a =>
        {
            var levelClass = levelClasses.FirstOrDefault(c => c.Id == a.ClassId);

            var className = levelClass != null
                ? classes.FirstOrDefault(c => c.Id == levelClass.ClassId)?.Name
                : null;

            var streamName = levelClass != null
                ? streams.FirstOrDefault(s => s.Id == levelClass.StreamId)?.Name
                : null;

            var user = a.LastModifierUserId.HasValue
                ? users.FirstOrDefault(u => u.Id == a.LastModifierUserId.Value)
                : null;

            return new
            {
                a.Id,
                a.IsCanceled,
                a.Type,
                a.AcademicYearId,
                a.TermId,
                a.ClassId,
                a.SubjectId,
                a.AssignmentNumber,
                a.AssignedDate,
                a.OverallMark,
                CanceledDate = a.LastModificationTime,
                CanceledBy = user == null ? null : user.Name,
                ClassName = $"{className} {streamName}".Trim()
            };
        }).ToList();

        return result;
    }
    public async Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency)
    {
        var start = startDate.Date;
        var end = endDate.Date.AddDays(1).AddTicks(-1);
        var schProfile = await _schoolProfileRepository.GetAll().FirstOrDefaultAsync();
    
        var journals = await _repositoryJournal.GetAll()
            .Where(j => j.BatchDate >= start 
                        && j.BatchDate <= end 
                        && j.TransactionSource == "SM")
            .ToListAsync();

        var journalIds = journals.Select(j => j.Id).ToList();

        var journalDetails = await _repositoryJournalDetail.GetAll()
            .Where(d => journalIds.Contains(d.JournalId) && d.IsMultiCurrency == isMultiCurrency)
            .ToListAsync();

        var result = (from j in journals
                join d in journalDetails on j.Id equals d.JournalId
                select new
                {
                    j.BatchNumber,
                    j.TransactionSource,
                    d.AccountName,
                    d.Description,
                    d.DebitAmount,
                    d.CreditAmount,
                    TransactionDate = d.TransactionDate.ToString("dd-MMM-yyyy"),
                    d.CurrencyCode,
                    d.CurrencyName,
                    d.OuName,
                    d.ReferenceNumber,
                    d.ChequeNo,
                    d.IsMultiCurrency,
                    SchooName = schProfile.SchoolName,
                })
            // 🔽 Order by batch number, then ensure credit comes before debit
            .OrderBy(x => x.BatchNumber)
            .ThenByDescending(x => x.CreditAmount > 0)
            .ThenBy(x => x.AccountName)
            .ToList();

        return new
        {
            code = 200,
            message = "GL transaction details retrieved successfully",
            data = result
        };
    }
    
    private class TermDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }
    private class BillTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
    }
      private class BillScopeDto
        {
            public int Id { get; set; }
            public string Name { get; set; }
        }

    private async Task<string> GetCityName(Guid cityId)
    {
        var city = await _cityRepository.FirstOrDefaultAsync(cityId);
        return city?.Name;
    }
   public async Task<object> StudentStatement(Guid studentId, DateTime startDate, DateTime endDate)
{
    var student = await _studentInfoRepository.FirstOrDefaultAsync(studentId);
    if (student == null)
        return new { code = 404, message = "Student not found." };
    var classInfo = await _levelClassRepo.GetAsync(student.ClassId);
    var streamName = await _smEmailManager.GetStreamName(classInfo.StreamId);
    var mainClassName = await _smEmailManager.GetClassName(classInfo.ClassId);
    var className = $"{mainClassName} {streamName}".Trim();

    var studentName = string.Join(" ", new[]
        {
            student.FirstName,
            student.OtherName,
            student.LastName
        }
        .Where(x => !string.IsNullOrWhiteSpace(x)));
    

    var cityName = student.CityId != Guid.Empty
        ? await GetCityName(student.CityId)
        : "";

    var regNo   = student.StudentIdentifier;
    var address = student.Address;
    // ==============================
    // FETCH ALL DATA
    // ==============================
    var openingBalances = await _studentOpeningBalanceRepository
        .GetAllListAsync(x => x.StudentId == studentId);

    var totalOpeningBalance = openingBalances.Sum(x => x.Amount * x.Rate);
    var openingBalanceDate  = openingBalances.OrderBy(x => x.Date).FirstOrDefault()?.Date ?? startDate;

    var allBills = await _billRepository
        .GetAllListAsync(x => !x.IsCancelled);

    var studentBills = allBills
        .Where(x =>
            x.Students != null &&
            x.Students.Any(s => s.StudentId == studentId && s.ToBeBilled))
        .ToList();

    var memos = await _repositoryMemo
        .GetAllListAsync(x => x.StudentId == studentId && !x.IsCanceled);

    var payments = await _repositoryPayment
        .GetAllListAsync(x => x.StudentId == studentId && !x.IsCanceled);

    // ==============================
    // BUILD ALL RECORDS (no date filter yet)
    // ==============================
    var allRecords = new List<StudentStatementRecord>();

    // Opening Balance
    if (openingBalances.Any())
    {
        allRecords.Add(new StudentStatementRecord
        {
            Type = "OpeningBalance",
            Date = openingBalanceDate,
            Description = "Opening Balance",
            Amount      = totalOpeningBalance,
            Payment     = 0m,
            StudentId   = student.Id,
            StudentName = studentName,
            Address     = address,
            ClassName   = className,
            CityName    = cityName,
            RegNo       = regNo
        });
    }

    // Bills
    foreach (var bill in studentBills)
    {
        var billedStudent = bill.Students.First(s => s.StudentId == studentId && s.ToBeBilled);
        var billAmount = billedStudent.Amount;

        var academicYear = await _academicYearRepository.FirstOrDefaultAsync(bill.AcademicYearId);
        var termsPath = Path.Combine(_webHostEnvironment.WebRootPath, "jsonDataSample", "terms.json");
        var termsJson = await File.ReadAllTextAsync(termsPath);
        var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson);
        var term = terms?.FirstOrDefault(c => c.Id == bill.TermId);
        var billTypeName = bill.BillTypeId switch
        {
            1 => "Standard",
            2 => "Sup.",
            3 => "Boarding",
            _ => "Unknown"
        };
        var billDescription = term != null
            ? $"Fees For {term.Name} {academicYear?.Name} - {billTypeName} Bill #{bill.BillNumber}"
            : $"Student Bill - {bill.BillNumber}/{billTypeName}";

        allRecords.Add(new StudentStatementRecord
        {
            Type        = "Bill",
            Date        = bill.BillDate,
            Description = billDescription,
            Amount      = billAmount,
            Payment     = 0m,
            StudentId   = student.Id,
            StudentName = studentName,
            Address = address,
            ClassName = className,
            CityName = cityName,
            RegNo = regNo
            
        });
    }

    // Credit Memos
    foreach (var memo in memos)
    {
        allRecords.Add(new StudentStatementRecord
        {
            Type        = "CreditMemo",
            Date        = memo.Date,
            Description = memo.Description,
            Amount      = -memo.AmountToCredit,
            Payment     = 0m,
            StudentId   = student.Id,
            StudentName = studentName,
            Address = address,
            ClassName = className,
            CityName = cityName,
            RegNo = regNo
        });
    }

    // Payments
    foreach (var payment in payments)
    {
        allRecords.Add(new StudentStatementRecord
        {
            Type        = "Payment",
            Date        = payment.PaymentDate,
            Description = payment.Description,
            Amount      = 0m,
            Payment     = payment.AmountToPaid,
            StudentId   = student.Id,
            StudentName = studentName,
            Address = address,
            ClassName = className,
            CityName = cityName,
            RegNo = regNo
        });
    }

    // ==============================
    // SORT ALL RECORDS
    // ==============================
    var orderedRecords = allRecords
        .OrderBy(r => r.Date)
        .ThenBy(r => GetStudentStatementSortPriority(r.Type))
        .ToList();

    // ==============================
    // COMPUTE RUNNING BALANCE ACROSS ALL RECORDS
    // ==============================
    decimal runningBalance = 0m;
    foreach (var rec in orderedRecords)
    {
        if (rec.Type == "Bill" || rec.Type == "OpeningBalance" || rec.Type == "CreditMemo")
            runningBalance += rec.Amount;
        else if (rec.Type == "Payment")
            runningBalance -= rec.Payment;

        rec.Balance = runningBalance;
    }

    // ==============================
    // COMPUTE BBF — last balance before startDate
    // ==============================
    var lastBeforeStart = orderedRecords
        .LastOrDefault(r => r.Date < startDate);
    /*var lastBeforeStart = orderedRecords
        .Where(r => r.Date < startDate)
        .LastOrDefault();*/
    var bbfBalance = lastBeforeStart?.Balance ?? 0m;

    var bbfRecord = new StudentStatementRecord
    {
        Type        = "BBF",
        Date        = startDate.AddDays(-1),
        Description = "Balance B/F",
        Amount      = 0m,
        Payment     = 0m,
        Balance     = bbfBalance,
        StudentId   = student.Id,
        StudentName = studentName,
        Address = address,
        ClassName = className,
        CityName = cityName,
        RegNo = regNo
    };

    // ==============================
    // SLICE TO DATE RANGE + PREPEND BBF
    // ==============================
    var inRange = orderedRecords
        .Where(r => r.Date >= startDate && r.Date <= endDate)
        .ToList();

    var finalRecords = new List<StudentStatementRecord> { bbfRecord }
        .Concat(inRange)
        .ToList();

    // ==============================
    // PROJECT TO FLAT OUTPUT
    // ==============================
    var lines = finalRecords.Select(r => new
    {
        studentId      = r.StudentId,
        studentName    = r.StudentName,
        startDate      = startDate.ToString("dd-MMM-yyyy"),
        endDate        = endDate.ToString("dd-MMM-yyyy"),
        closingBalance = runningBalance,
        type           = r.Type,
        date           = r.Date.ToString("dd-MMM-yyyy"),
        description    = r.Description,
        amount         = r.Amount,
        payment        = r.Payment,
        balance        = r.Balance,
        Address        = r.Address,
        ClassName      = r.ClassName,
        CityName       = r.CityName,
        RegNo          = r.RegNo
    }).ToList();

    return new { code = 200, lines };
}
public async Task<List<object>> MultipleStudentStatements(StatementRequestDto input)
{
    if (input == null)
    {
        throw new UserFriendlyException("Request cannot be null.");
    }

    if (input.StudentIds == null || !input.StudentIds.Any())
    {
        throw new UserFriendlyException("No students selected.");
    }

    var statements = new List<object>();

    foreach (var studentId in input.StudentIds)
    {
        var statement = await StudentStatement(
            studentId,
            input.StartDate,
            input.EndDate
        );

        statements.Add(statement);
    }

    return statements;
}
   int GetStudentStatementSortPriority(string type)
{
    return type switch
    {
        "BBF"            => 0,
        "OpeningBalance" => 1,
        "Bill"           => 2,
        "CreditMemo"     => 3,
        "Payment"        => 4,
        _                => 5
    };
}
   
public async Task<object> StudentBalance(Guid studentId, DateTime startDate)
{
    var student = await _studentInfoRepository.FirstOrDefaultAsync(studentId);

    if (student == null)
        return new { code = 404, message = "Student not found." };

    var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);

    var streamName = classInfo != null
        ? await _smEmailManager.GetStreamName(classInfo.StreamId)
        : "";

    var mainClassName = classInfo != null
        ? await _smEmailManager.GetClassName(classInfo.ClassId)
        : "";

    var className = $"{mainClassName} {streamName}".Trim();

    var studentName = string.Join(" ",
        new[]
        {
            student.FirstName,
            student.OtherName,
            student.LastName
        }.Where(x => !string.IsNullOrWhiteSpace(x)));

    var lines = new List<object>
    {
        new
        {
            studentId = student.StudentIdentifier,
            studentName,
            className,
            studentPhone = student.PhoneNumber,
            studentContact = student.ContactNumber,
            balance = student.BalanceDue,
            startDate = startDate.ToString("dd-MMM-yyyy")
        }
    };

    return new
    {
        code = 200,
        lines
    };
}
public async Task<object> ClassStudentsBalance(Guid classId, DateTime startDate)
{
    var students = await _studentInfoRepository.GetAllListAsync();
    var inClass = students.Where(x => x.ClassId == classId).ToList();

    var classInfo = await _levelClassRepo.FirstOrDefaultAsync(classId);

    var streamName = classInfo != null
        ? await _smEmailManager.GetStreamName(classInfo.StreamId)
        : "";

    var mainClassName = classInfo != null
        ? await _smEmailManager.GetClassName(classInfo.ClassId)
        : "";

    var className = $"{mainClassName} {streamName}".Trim();

    var lines = inClass
        .OrderBy(s => s.LastName)
        .ThenBy(s => s.FirstName)
        .Select(s => new
        {
            studentId = s.StudentIdentifier,
            studentName = string.Join(" ", new[]
            {
                s.FirstName,
                s.OtherName,
                s.LastName
            }.Where(x => !string.IsNullOrWhiteSpace(x))),
            regNo = s.StudentIdentifier,
            className,
            balance = s.BalanceDue,
            studentPhone = s.PhoneNumber ?? "--",
            studentContact = s.ContactNumber ?? "--",
            startDate = startDate.ToString("dd-MMM-yyyy")
        })
        .ToList();

    return new
    {
        code = 200,
        lines,
        totalStudents = lines.Count,
        totalBalance = lines.Sum(x => x.balance)
    };
}
private string GetFeeItemDescription(int billTypeId, Guid feeItemId,
    Dictionary<Guid, FeesDescription> standardDict,
    Dictionary<Guid, BoardingItem> boardingDict,
    Dictionary<Guid, SupplementaryItem> supDict)
{
    return billTypeId switch
    {
        1 => standardDict.TryGetValue(feeItemId, out var std)
            ? std.Description
            : "N/A",

        2 => supDict.TryGetValue(feeItemId, out var sup)
            ? $"{sup.Name} (Supplementary)"
            : "N/A",

        3 => boardingDict.TryGetValue(feeItemId, out var brd)
            ? $"{brd.Name} (Boarding)"
            : "N/A",

        _ => "N/A"
    };
}
public async Task<object> GetBillFooters(Guid studentId, Guid academicYearId, Guid termId)
{
    // STUDENT
    var student = await _studentInfoRepository.FirstOrDefaultAsync(studentId);

    if (student == null)
    {
        return new
        {
            code = 404,
            message = "Student not found."
        };
    }
    
    // FOOTERS
    var footers = await _billFooterRepository.GetAllListAsync(x =>
        x.AcademicYearId == academicYearId &&
        x.TermId == termId);
    
    // FILTER FOOTERS
    var filteredFooters = footers
        .Where(f =>
            f.ToSchool || (f.ToClass && f.Details != null && f.Details.Any(d => d.ClassId == student.ClassId))
                       || (f.Details != null && f.Details.Any(d => d.StudentId == student.Id)))
        .OrderBy(f => f.OrderNumber).ToList();
    
    // FLAT OUTPUT
    var lines = filteredFooters.Select(f => new
        {
            footerId = f.Id,
            message = f.Message,
            orderNumber = f.OrderNumber,
            toSchool = f.ToSchool,
            toClass = f.ToClass
        })
        .OrderBy(x => x.orderNumber)
        .ToList();

    return new
    {
        code = 200,
        studentId = student.Id,
        classId = student.ClassId,
        footers = lines
    };
}
public async Task<object> GetBillByClass(
    Guid classId,
    Guid academicYearId,
    Guid termId,
    int billTypeId,
    Guid feeItemId)
{
    // =========================
    // STUDENTS IN CLASS
    // =========================

    var students = await _studentInfoRepository.GetAllListAsync(x => x.ClassId == classId);

    if (!students.Any())
    {
        return new
        {
            code = 404,
            message = "No students found in class."
        };
    }

    var studentLookup = students.ToDictionary(x => x.Id);

    // =========================
    // BILLS
    // =========================

    var bills = await _billRepository.GetAllListAsync(x =>
        !x.IsCancelled &&
        x.AcademicYearId == academicYearId &&
        x.TermId == termId &&
        x.BillTypeId == billTypeId);

    // Filter in memory because Students is a JSON collection
    bills = bills
        .Where(b => b.Students.Any(s => studentLookup.ContainsKey(s.StudentId)))
        .ToList();

    if (!bills.Any())
    {
        return new
        {
            code = 404,
            message = "No bills found."
        };
    }

    // =========================
    // PERIOD
    // =========================

    var academicYear = await _academicYearRepository.FirstOrDefaultAsync(academicYearId);

    var termsPath = Path.Combine(
        _webHostEnvironment.WebRootPath,
        "jsonDataSample",
        "terms.json");

    var termsJson = await File.ReadAllTextAsync(termsPath);

    var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                ?? new List<TermDto>();

    var term = terms.FirstOrDefault(x => x.Id == termId);

    var period = $"{academicYear?.Name} - {term?.Name}";

    // =========================
    // FEE ITEMS
    // =========================

    var feeItems = await _standardFeeItemRepository.GetAllListAsync();
    var boardingItems = await _boardingItemRepository.GetAllListAsync();
    var supItems = await _supItemRepository.GetAllListAsync();

    var standardDict = feeItems.ToDictionary(x => x.Id);
    var boardingDict = boardingItems.ToDictionary(x => x.Id);
    var supDict = supItems.ToDictionary(x => x.Id);

    // =========================
    // BUILD RESULT
    // =========================

    var result = new List<object>();

    foreach (var bill in bills)
    {
        var feeDetail = bill.Details.FirstOrDefault(x => x.FeeItemId == feeItemId);

        if (feeDetail == null)
            continue;
        var description = GetFeeItemDescription(
            bill.BillTypeId,
            feeDetail.FeeItemId,
            standardDict,
            boardingDict,
            supDict);

        foreach (var billedStudent in bill.Students.Where(x => x.ToBeBilled))
        {
            if (!studentLookup.TryGetValue(billedStudent.StudentId, out var student))
                continue;

            var studentName = string.Join(" ", new[]
            {
                student.FirstName,
                student.OtherName,
                student.LastName
            }.Where(x => !string.IsNullOrWhiteSpace(x)));
            var amount = bill.BillTypeId is 1 or 3 ? feeDetail.Amount : billedStudent.Amount;
            
            result.Add(new
            {
                studentId = student.Id,
                studentName,
                regNo = student.StudentIdentifier,
                classId,
                period,
                billTypeId = bill.BillTypeId,
                feeItemId = feeDetail.FeeItemId,
                amount,
                discountAmount = billedStudent.DiscountAmount,
                discountPercentage = billedStudent.DiscountPercentage,
                description
            });
        }
    }

    return new
    {
        code = 200,
        total = result.Count,
        data = result
    };
}


        private string ConvertAmountToWords(decimal amount, string majorName, string minorName)
        {
            if (amount == 0) return "Zero";

            var unitsMap = new[]
            {
             "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
             };
             var tensMap = new[] { "Zero", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

            var words = "";

            long integerPart = (long)amount;
            // Extract fractional part
            int fractionalPart = (int)((amount - integerPart) * 100); 

            // Convert integer part
            if (integerPart > 0)
            {
                words += ConvertIntegerToWords(integerPart, unitsMap, tensMap) + " " + majorName;
            }

            // Convert fractional part
            if (fractionalPart > 0)
            {
                if (!string.IsNullOrEmpty(words)) words += " and ";
                words += ConvertIntegerToWords(fractionalPart, unitsMap, tensMap) + " " + minorName;
            }

            return words.Trim();
        }
        private string ConvertIntegerToWords(long number, string[] unitsMap, string[] tensMap)
        {
            if (number == 0) return "";

            var words = "";

            if (number / 1000000 > 0)
            {
                words += ConvertIntegerToWords(number / 1000000, unitsMap, tensMap) + " Million ";
                number %= 1000000;
            }
            if (number / 1000 > 0)
            {
                words += ConvertIntegerToWords(number / 1000, unitsMap, tensMap) + " Thousand ";
                number %= 1000;
            }
            if (number / 100 > 0)
            {
                words += ConvertIntegerToWords(number / 100, unitsMap, tensMap) + " Hundred ";
                number %= 100;
            }
            if (number > 0)
            {
                if (words != "") words += "and ";

                if (number < 20)
                    words += unitsMap[number];
                else
                {
                    words += tensMap[number / 10];
                    if ((number % 10) > 0)
                        words += "-" + unitsMap[number % 10];
                }
            }

            return words.Trim();
        }

        private class PaymentMethodDto
        {
            public int Id { get; set; }
            public string Name { get; set; }
        }
        public async Task<object> GetPaymentReceipts(Guid paymentId, Guid studentId)
        {
        var payments = await _repositoryPayment.GetAllListAsync(s => s.Id == paymentId && s.IsCanceled == false);
        if (payments == null || payments.Count == 0)
        {
            return new { code = 404, message = "Payment not found." };
        }
        

        var receipts = new List<SchPaymentReceipt>();

        foreach (var record in payments)
        {

           
            var currency = await _currencyRepository.FirstOrDefaultAsync(c => c.Id == record.CurrencyId);
            var currencyName = currency != null ? currency.CurrencyName : "Ghana Cedis";
            var currencyCode = currency != null ? currency.CurrencyCode : "GHS";
            var minorName = currency != null ? currency.MinorName : "peswas";
            
            string userName = "";
            
            
            var student = await _studentInfoRepository.FirstOrDefaultAsync(studentId);
            var studentName = student != null ? $"{student.FirstName} {student.OtherName} {student.LastName}".Trim() : "Unknown Student";
            var regNo = student != null ? student.StudentIdentifier : "Unknown RegNo";
            var className = "";
            if (student != null)
            {
                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);
                var streamName = classInfo != null ? await _smEmailManager.GetStreamName(classInfo.StreamId) : "";
                var mainClassName = classInfo != null ? await _smEmailManager.GetClassName(classInfo.ClassId) : "";
                className = $"{mainClassName} {streamName}".Trim();
            }
            var academicYear = await _academicYearRepository.FirstOrDefaultAsync(record.AcademicYearId);

            var termsPath = Path.Combine(
                _webHostEnvironment.WebRootPath,
                "jsonDataSample",
                "terms.json");

            var termsJson = await File.ReadAllTextAsync(termsPath);

            var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                        ?? new List<TermDto>();

            var term = terms.FirstOrDefault(x => x.Id == record.TermId);

            var period = $"{academicYear?.Name} - {term?.Name}";
            
            var paymentMethodPath = Path.Combine(
                _webHostEnvironment.WebRootPath,
                "jsonDataSample",
                "paymentMethods.json");

            var paymentMethodsJson = await File.ReadAllTextAsync(paymentMethodPath);

            var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(paymentMethodsJson)
                                 ?? new List<PaymentMethodDto>();

            var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == record.PaymentMethod);
            var paymentMethodName = paymentMethod != null ? paymentMethod.Name : "N/A";

            var banks = await _bankRepository.GetAllListAsync();
            var bank = banks.FirstOrDefault(x => x.Id == record.BankId);
            var bankName = bank?.Name ?? "";

            // get branches from bank <branches> — guard against bank being null
            var bankBranchName = "";
            if (bank != null && bank.BankBranches != null)
            {
                var bankBranch = bank.BankBranches.FirstOrDefault(x => x.Id == record.BankBranchId);
                bankBranchName = bankBranch != null ? bankBranch.Name : "";
            }
            if (_abpSession.UserId.HasValue)
            {
                var user = await _userRepository.FirstOrDefaultAsync(u => u.Id == record.CreatorUserId);
                userName = user?.Name ?? "Unknown";
            }
            receipts.Add(new SchPaymentReceipt
            {
                StudentName = studentName,
                RegNo = regNo,
                ClassName = className,
                UserName = userName,
                PaymentDate = record.PaymentDate.ToString("dd-MMM-yyyy"),
                CurrencyName = currencyName,
                CurrencyCode = currencyCode,
                PaidAmount     = record.AmountToPaid,
                AmountInWords  = ConvertAmountToWords(record.AmountToPaid, currencyName, minorName),
                ModeOfPayment  = paymentMethodName,
                ChequeNo = string.IsNullOrWhiteSpace(record.ChequeNumber) ? paymentMethodName : record.ChequeNumber,
                BankDetail       = !string.IsNullOrEmpty(bankName) ? $"{bankName} - {bankBranchName}" : "",
                ReceiptNo      = record.ReceiptNumber,
                Period         = period,
                Description = record.Description,
                /*Balance = student != null ? student.BalanceDue - record.AmountToPaid : 0m*/
                Balance = record.Balance
                
            });
        }

        return receipts;
        }
        
        public async Task<List<SchPaymentReceipt>> GetPaymentReceipts(PaymentReceiptRequestDto input)
        {
            var payments = await _repositoryPayment.GetAllListAsync(x =>
                input.PaymentIds.Contains(x.Id) &&
                !x.IsCanceled);

            if (!payments.Any())
            {
                return new List<SchPaymentReceipt>();
            }

        var receipts = new List<SchPaymentReceipt>();

        // Load lookup data once
        var currencies = await _currencyRepository.GetAllListAsync();
        var banks = await _bankRepository.GetAllListAsync();
        var academicYears = await _academicYearRepository.GetAllListAsync();

        var termsPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "terms.json");

        var terms = JsonConvert.DeserializeObject<List<TermDto>>(
            await File.ReadAllTextAsync(termsPath))
            ?? new List<TermDto>();

        var paymentMethodPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "paymentMethods.json");

        var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(
            await File.ReadAllTextAsync(paymentMethodPath))
            ?? new List<PaymentMethodDto>();

        foreach (var record in payments)
        {
            var currency = currencies.FirstOrDefault(c => c.Id == record.CurrencyId);

            var currencyName = currency?.CurrencyName ?? "Ghana Cedis";
            var currencyCode = currency?.CurrencyCode ?? "GHS";
            var minorName = currency?.MinorName ?? "Pesewas";

            var student = await _studentInfoRepository.FirstOrDefaultAsync(record.StudentId);

            var studentName = student != null
                ? $"{student.FirstName} {student.OtherName} {student.LastName}".Trim()
                : "Unknown Student";

            var regNo = student?.StudentIdentifier ?? "";

            string className = "";

            if (student != null)
            {
                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);

                if (classInfo != null)
                {
                    var streamName = await _smEmailManager.GetStreamName(classInfo.StreamId);
                    var mainClassName = await _smEmailManager.GetClassName(classInfo.ClassId);

                    className = $"{mainClassName} {streamName}".Trim();
                }
            }

            var academicYear = academicYears.FirstOrDefault(x => x.Id == record.AcademicYearId);
            var term = terms.FirstOrDefault(x => x.Id == record.TermId);

            var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == record.PaymentMethod);

            var bank = banks.FirstOrDefault(x => x.Id == record.BankId);

            string bankBranchName = "";

            if (bank?.BankBranches != null)
            {
                bankBranchName = bank.BankBranches
                    .FirstOrDefault(x => x.Id == record.BankBranchId)?.Name ?? "";
            }

            string userName = "Unknown";

            if (record.CreatorUserId.HasValue)
            {
                var user = await _userRepository.FirstOrDefaultAsync(record.CreatorUserId.Value);
                userName = user?.Name ?? "Unknown";
            }

            receipts.Add(new SchPaymentReceipt
            {
                StudentName = studentName,
                RegNo = regNo,
                ClassName = className,
                UserName = userName,
                PaymentDate = record.PaymentDate.ToString("dd-MMM-yyyy"),
                CurrencyName = currencyName,
                CurrencyCode = currencyCode,
                PaidAmount = record.AmountToPaid,
                AmountInWords = ConvertAmountToWords(
                    record.AmountToPaid,
                    currencyName,
                    minorName),
                ModeOfPayment = paymentMethod?.Name ?? "N/A",
                ChequeNo = string.IsNullOrWhiteSpace(record.ChequeNumber)
                    ? paymentMethod?.Name ?? ""
                    : record.ChequeNumber,
                BankDetail = bank == null
                    ? ""
                    : $"{bank.Name} - {bankBranchName}",
                ReceiptNo = record.ReceiptNumber,
                Period = $"{academicYear?.Name} - {term?.Name}",
                Description = record.Description,
                Balance = record.Balance
            });
        }

        return receipts;
        }
        
        public async Task<object> GetCancelledBills(Guid academicYearId, Guid termId)
        {
            var students = await _studentInfoRepository.GetAllListAsync();

            if (!students.Any())
            {
                return new
                {
                    code = 404,
                    message = "No students found."
                };
            }

            var studentLookup = students.ToDictionary(x => x.Id);

            // =========================
            // BILLS
            // =========================
            var bills = await _studentBillInfoRepository.GetAllListAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.IsCanceled);

            if (!bills.Any())
            {
                return new
                {
                    code = 404,
                    message = "No bills found."
                };
            }

            // =========================
            // PERIOD
            // =========================

            var academicYear = await _academicYearRepository.FirstOrDefaultAsync(academicYearId);

            var termsPath = Path.Combine(
                _webHostEnvironment.WebRootPath,
                "jsonDataSample",
                "terms.json");

            var termsJson = await File.ReadAllTextAsync(termsPath);

            var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                        ?? new List<TermDto>();

            var term = terms.FirstOrDefault(x => x.Id == termId);

            var period = $"{academicYear?.Name} - {term?.Name}";
            
            // =========================
            // BUILD RESULT
            // =========================

            var result = new List<object>();

           
            foreach (var billedStudent in bills)
            {
                if (!studentLookup.TryGetValue(billedStudent.StudentId, out var student))
                    continue;

                var studentName = string.Join(" ", new[]
                {
                    student.FirstName,
                    student.OtherName,
                    student.LastName
                }.Where(x => !string.IsNullOrWhiteSpace(x)));
                var className = "";
                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);
                var streamName = classInfo != null ? await _smEmailManager.GetStreamName(classInfo.StreamId) : "";
                var mainClassName = classInfo != null ? await _smEmailManager.GetClassName(classInfo.ClassId) : "";
                className = $"{mainClassName} {streamName}".Trim();
                    
                result.Add(new
                {
                    studentId = student.Id,
                    classId = billedStudent.ClassId,
                    studentName,
                    regNo = student.StudentIdentifier,
                    className,
                    period,
                    billDate = billedStudent.BillDate.ToString("dd-MMM-yyyy"),
                    amount = billedStudent.Amount,
                    billNumber = billedStudent.BillNumber,
                    cancelBy = billedStudent.CanceledBy,
                    cancelDate = billedStudent.LastModificationTime?.ToString("dd-MMM-yyyy")
                });
            }

            return new
            {
                code = 200,
                total = result.Count,
                data = result
            };
        }
        public async Task<object> BillReconciliation(DateTime startDate, DateTime endDate)
        {
            var bills = await _billRepository.GetAllListAsync(x =>
                x.BillDate >= startDate &&
                x.BillDate <= endDate &&
                !x.IsCancelled);

            if (!bills.Any())
            {
                return new
                {
                    code = 404,
                    message = "No bills found."
                };
            }

            // Collect all billed amounts per student
            var studentTotals = bills
                .SelectMany(b => b.Students
                    .Where(s => s.ToBeBilled)
                    .Select(s => new
                    {
                        s.StudentId,
                        BillDate = b.BillDate.Date,
                        Amount = s.Amount
                    }))
                .GroupBy(x => new
                {
                    x.StudentId,
                    x.BillDate
                })
                .Select(x => new
                {
                    x.Key.StudentId,
                    x.Key.BillDate,
                    TotalAmount = x.Sum(y => y.Amount)
                })
                .OrderBy(x => x.BillDate)
                .ToList();

            var result = new List<object>();

            foreach (var item in studentTotals)
            {
                var student = await _studentInfoRepository.FirstOrDefaultAsync(item.StudentId);

                if (student == null)
                    continue;

                var studentName = string.Join(" ", new[]
                {
                    student.FirstName,
                    student.OtherName,
                    student.LastName
                }.Where(x => !string.IsNullOrWhiteSpace(x)));

                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);

                var streamName = classInfo != null
                    ? await _smEmailManager.GetStreamName(classInfo.StreamId)
                    : "";

                var mainClassName = classInfo != null
                    ? await _smEmailManager.GetClassName(classInfo.ClassId)
                    : "";

                var className = $"{mainClassName} {streamName}".Trim();

                result.Add(new
                {
                    studentId = student.Id,
                    classId = classInfo?.Id,
                    studentName,
                    regNo = student.StudentIdentifier,
                    className,
                    billDate = item.BillDate.ToString("dd-MMM-yyyy"),
                    totalBilled = item.TotalAmount
                });
            }

            return new
            {
                code = 200,
                data = result.OrderBy(x => ((dynamic)x).billDate).ThenBy(x => ((dynamic)x).className)
            };
        }
        public async Task<object> BillReconciliationSummary(Guid academicYearId, Guid termId)
        {
            var bills = await _billRepository.GetAllListAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                !x.IsCancelled);

            if (!bills.Any())
            {
                return new
                {
                    code = 404,
                    message = "No bills found."
                };
            }

            var result = new List<object>();

            foreach (var bill in bills)
            {
                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(bill.ClassId);

                var streamName = classInfo != null
                    ? await _smEmailManager.GetStreamName(classInfo.StreamId)
                    : "";

                var mainClassName = classInfo != null
                    ? await _smEmailManager.GetClassName(classInfo.ClassId)
                    : "";

                var className = $"{mainClassName} {streamName}".Trim();
            
                var billTypePath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "billTypes.json");
            
                var billTypesJson = await File.ReadAllTextAsync(billTypePath);
            
                var billTypes = JsonConvert.DeserializeObject<List<BillTypeDto>>(billTypesJson)
                                ?? new List<BillTypeDto>();
            
                var billType = billTypes.FirstOrDefault(x => x.Id == bill.BillTypeId);
            
                     
                var billScopePath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "billingScope.json");
            
                var billScopesJson = await File.ReadAllTextAsync(billScopePath);
            
                var billScopes = JsonConvert.DeserializeObject<List<BillScopeDto>>(billScopesJson)
                                 ?? new List<BillScopeDto>();
            
                var billScope = billScopes.FirstOrDefault(x => x.Id == bill.BillingScopeId);
                var totalBilled = bill.Students
                    .Where(x => x.ToBeBilled)
                    .Sum(x => x.Amount);

                result.Add(new
                {
                    billNumber = bill.BillNumber,
                    billDate = bill.BillDate.ToString("dd-MMM-yyyy"),
                    classId = bill.ClassId,
                    className,
                    totalStudents = bill.Students.Count(x => x.ToBeBilled),
                    totalBilled,
                    billType = billType?.Name,
                    billScope = billScope?.Name
                });
            }

            return new
            {
                code = 200,
                data = result
                    .OrderBy(x => ((dynamic)x).billDate)
                    .ThenBy(x => ((dynamic)x).className)
            };
        }
        public async Task<object> GetPayments(DateTime startDate, DateTime endDate)
        {
            var payments = await _repositoryPayment.GetAllListAsync(s => s.PaymentDate >= startDate && s.PaymentDate <= endDate && s.IsCanceled == false && s.IsProcessed);
            if (payments == null || payments.Count == 0)
            {
                return new { code = 404, message = "Payment not found." };
            }
        

            var result = new List<object>();

            foreach (var record in payments)
            {

           
                var currency = await _currencyRepository.FirstOrDefaultAsync(c => c.Id == record.CurrencyId);
                var currencyName = currency != null ? currency.CurrencyName : "Ghana Cedis";
                var currencyCode = currency != null ? currency.CurrencyCode : "GHS";
                string userName = "";
                if (_abpSession.UserId.HasValue)
                {
                    var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
                    userName = user?.Name ?? "Unknown";
                }
            
                var student = await _studentInfoRepository.FirstOrDefaultAsync(record.StudentId);
                var studentName = student != null ? $"{student.FirstName} {student.OtherName} {student.LastName}".Trim() : "Unknown Student";
                var regNo = student != null ? student.StudentIdentifier : "Unknown RegNo";
                var className = "";
                if (student != null)
                {
                    var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);
                    var streamName = classInfo != null ? await _smEmailManager.GetStreamName(classInfo.StreamId) : "";
                    var mainClassName = classInfo != null ? await _smEmailManager.GetClassName(classInfo.ClassId) : "";
                    className = $"{mainClassName} {streamName}".Trim();
                }
            
                var paymentMethodPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "paymentMethods.json");

                var paymentMethodsJson = await File.ReadAllTextAsync(paymentMethodPath);

                var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(paymentMethodsJson)
                                     ?? new List<PaymentMethodDto>();

                var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == record.PaymentMethod);
                var paymentMethodName = paymentMethod != null ? paymentMethod.Name : "N/A";

                var banks = await _bankRepository.GetAllListAsync();
                var bank = banks.FirstOrDefault(x => x.Id == record.BankId);
                var bankName = bank?.Name ?? "";

                // get branches from bank <branches> — guard against bank being null
                var bankBranchName = "";
                if (bank != null && bank.BankBranches != null)
                {
                    var bankBranch = bank.BankBranches.FirstOrDefault(x => x.Id == record.BankBranchId);
                    bankBranchName = bankBranch != null ? bankBranch.Name : "";
                }

                result.Add(new 
                {
                    StudentId = student?.Id,
                    StudentName = studentName,
                    RegNo = regNo,
                    ClassName = className,
                    UserName = userName,
                    PaymentDate = record.PaymentDate.ToString("dd-MMM-yyyy"),
                    CurrencyName = currencyName,
                    CurrencyCode = currencyCode,
                    PaidAmount     = record.AmountToPaid,
                    ModeOfPayment  = paymentMethodName,
                    ChequeNo = string.IsNullOrWhiteSpace(record.ChequeNumber) ? paymentMethodName : record.ChequeNumber,
                    BankDetail       = !string.IsNullOrEmpty(bankName) ? $"{bankName} - {bankBranchName}" : "",
                    ReceiptNo      = record.ReceiptNumber,
                    BankId         = bank?.Id,
                    bankGlId = record.BankGlId,
                    Balance = student != null ? student.BalanceDue - record.AmountToPaid : 0m
                });
            }

            return result.ToList();
        }
        public async Task<object> GetCancelledPayment(Guid academicYearId, Guid termId)
        {
            var cancelledPayments = await _repositoryPayment.GetAllListAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.IsCanceled);

            if (!cancelledPayments.Any())
            {
                return new
                {
                    code = 404,
                    message = "No cancelled payments found."
                };
            }

            var result = new List<object>();

            foreach (var payment in cancelledPayments)
            {
                var student = await _studentInfoRepository.FirstOrDefaultAsync(payment.StudentId);

                if (student == null)
                    continue;

                var studentName = string.Join(" ", new[]
                {
                    student.FirstName,
                    student.OtherName,
                    student.LastName
                }.Where(x => !string.IsNullOrWhiteSpace(x)));

                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);

                var streamName = classInfo != null
                    ? await _smEmailManager.GetStreamName(classInfo.StreamId)
                    : "";

                var mainClassName = classInfo != null
                    ? await _smEmailManager.GetClassName(classInfo.ClassId)
                    : "";

                var className = $"{mainClassName} {streamName}".Trim();
                var paymentMethodPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "paymentMethods.json");

                var paymentMethodsJson = await File.ReadAllTextAsync(paymentMethodPath);

                var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(paymentMethodsJson)
                                     ?? new List<PaymentMethodDto>();

                var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == payment.PaymentMethod);
                var paymentMethodName = paymentMethod != null ? paymentMethod.Name : "N/A";
        
                var academicYear = await _academicYearRepository.FirstOrDefaultAsync(academicYearId);

                var termsPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "terms.json");

                var termsJson = await File.ReadAllTextAsync(termsPath);

                var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                            ?? new List<TermDto>();

                var term = terms.FirstOrDefault(x => x.Id == termId);

                var period = $"{academicYear?.Name} - {term?.Name}";
                result.Add(new
                {
                    paymentId = payment.Id,
                    receiptNo = payment.ReceiptNumber,
                    paymentDate = payment.PaymentDate.ToString("dd-MMM-yyyy"),
                    studentName,
                    regNo = student.StudentIdentifier,
                    className,
                    amount = payment.AmountToPaid,
                    cancelledDate = payment.CanceledDate?.ToString("dd-MMM-yyyy HH:mm"),
                    cancelledBy = payment.CanceledBy,
                    chequeNo = string.IsNullOrWhiteSpace(payment.ChequeNumber) ? paymentMethodName : payment.ChequeNumber,
                    paymentMethod = paymentMethodName,
                    Currency = (await _currencyRepository.FirstOrDefaultAsync(payment.CurrencyId))?.CurrencyName ?? "N/A",
                });
            }

            return new
            {
                code = 200,
                totalCancelledPayments = result.Count,
                totalCancelledAmount = cancelledPayments.Sum(x => x.AmountToPaid),
                data = result.OrderByDescending(x => ((dynamic)x).paymentDate)
            };
        }
        public async Task<object> GetBillsAndPayments(DateTime startDate, DateTime endDate, Guid classId)
        {
            var students = await _studentInfoRepository.GetAllListAsync(x => x.ClassId == classId);

            if (!students.Any())
            {
                return new
                {
                    code = 404,
                    message = "No students found."
                };
            }

            var studentIds = students.Select(x => x.Id).ToList();

            // Bills before the period
            var previousBills = await _billRepository.GetAllListAsync(x =>
                x.ClassId == classId &&
                x.BillDate < startDate &&
                !x.IsCancelled);

            // Bills within the period
            var currentBills = await _billRepository.GetAllListAsync(x =>
                x.ClassId == classId &&
                x.BillDate >= startDate &&
                x.BillDate <= endDate &&
                !x.IsCancelled);

            // Payments before the period
            var previousPayments = await _repositoryPayment.GetAllListAsync(x =>
                x.ClassId == classId &&
                x.PaymentDate < startDate &&
                !x.IsCanceled && x.IsProcessed);

            // Payments within the period
            var currentPayments = await _repositoryPayment.GetAllListAsync(x =>
                x.ClassId == classId &&
                x.PaymentDate >= startDate &&
                x.PaymentDate <= endDate &&
                !x.IsCanceled);

            var result = new List<object>();

            foreach (var student in students)
            {
                var previousBillAmount = previousBills
                    .SelectMany(x => x.Students)
                    .Where(x => x.StudentId == student.Id && x.ToBeBilled)
                    .Sum(x => x.Amount);

                var currentBillAmount = currentBills
                    .SelectMany(x => x.Students)
                    .Where(x => x.StudentId == student.Id && x.ToBeBilled)
                    .Sum(x => x.Amount);

                var previousPaymentAmount = previousPayments
                    .Where(x => x.StudentId == student.Id)
                    .Sum(x => x.AmountToPaid);

                var currentPaymentAmount = currentPayments
                    .Where(x => x.StudentId == student.Id)
                    .Sum(x => x.AmountToPaid);

                var beginningBalance = previousBillAmount - previousPaymentAmount;

                var balanceDue = beginningBalance +
                                 currentBillAmount -
                                 currentPaymentAmount;

                var studentName = string.Join(" ", new[]
                {
                    student.FirstName,
                    student.OtherName,
                    student.LastName
                }.Where(x => !string.IsNullOrWhiteSpace(x)));

                result.Add(new
                {
                    studentId = student.Id,
                    regNo = student.StudentIdentifier,
                    studentName,
                    beginningBalance,
                    totalBillAmount = currentBillAmount,
                    totalPaymentAmount = currentPaymentAmount,
                    balance = student.BalanceDue,
                    calculatedBalanceDue = balanceDue
                });
            }

            return new
            {
                code = 200,
                data = result.OrderBy(x => ((dynamic)x).studentName)
            };
        }
        public async Task<object> GetCashierDailyPayments(DateTime startDate, DateTime endDate)
        {
            var payments = await _repositoryPayment.GetAllListAsync(s => s.PaymentDate >= startDate && s.PaymentDate <= endDate && s.IsCanceled == false);
            if (payments == null || payments.Count == 0)
            {
                return new { code = 404, message = "Payment not found." };
            }
                

            var result = new List<object>();

            foreach (var record in payments)
            {

                   
                var currency = await _currencyRepository.FirstOrDefaultAsync(c => c.Id == record.CurrencyId);
                var currencyName = currency != null ? currency.CurrencyName : "Ghana Cedis";
                var currencyCode = currency != null ? currency.CurrencyCode : "GH¢";
                string userName = "";
                /*if (_abpSession.UserId.HasValue)
                {
                    var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
                    userName = user?.Name ?? "Unknown";
                }*/
                    
                var student = await _studentInfoRepository.FirstOrDefaultAsync(record.StudentId);
                var studentName = student != null ? $"{student.FirstName} {student.OtherName} {student.LastName}".Trim() : "Unknown Student";
                var regNo = student != null ? student.StudentIdentifier : "Unknown RegNo";
                var className = "";
                if (student != null)
                {
                    var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);
                    var streamName = classInfo != null ? await _smEmailManager.GetStreamName(classInfo.StreamId) : "";
                    var mainClassName = classInfo != null ? await _smEmailManager.GetClassName(classInfo.ClassId) : "";
                    className = $"{mainClassName} {streamName}".Trim();
                }
                    
                var paymentMethodPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "paymentMethods.json");

                var paymentMethodsJson = await File.ReadAllTextAsync(paymentMethodPath);

                var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(paymentMethodsJson)
                                     ?? new List<PaymentMethodDto>();

                var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == record.PaymentMethod);
                var paymentMethodName = paymentMethod != null ? paymentMethod.Name : "N/A";

                var banks = await _bankRepository.GetAllListAsync();
                var bank = banks.FirstOrDefault(x => x.Id == record.BankId);
                var bankName = bank?.Name ?? "";

                // get branches from bank <branches> — guard against bank being null
                var bankBranchName = "";
                if (bank != null && bank.BankBranches != null)
                {
                    var bankBranch = bank.BankBranches.FirstOrDefault(x => x.Id == record.BankBranchId);
                    bankBranchName = bankBranch != null ? bankBranch.Name : "";
                }
                if (_abpSession.UserId.HasValue)
                {
                    var user = await _userRepository.FirstOrDefaultAsync(u => u.Id == record.CreatorUserId);
                    userName = user?.UserName ?? "Unknown";
                }
                result.Add(new 
                {
                    StudentName = studentName,
                    RegNo = regNo,
                    ClassName = className,
                    UserName = userName,
                    userId = record.CreatorUserId,
                    PaymentDate = record.PaymentDate.ToString("dd-MMM-yyyy"),
                    CurrencyName = currencyName,
                    CurrencyCode = currencyCode,
                    PaidAmount     = record.AmountToPaid,
                    ModeOfPayment  = paymentMethodName,
                    ChequeNo = string.IsNullOrWhiteSpace(record.ChequeNumber) ? paymentMethodName : record.ChequeNumber,
                    BankDetail       = !string.IsNullOrEmpty(bankName) ? $"{bankName} - {bankBranchName}" : "--",
                    ReceiptNo      = record.ReceiptNumber,
                    IsProcessed = record.IsProcessed,
                    IsPosted = record.IsPosted,
                    Balance = student != null ? student.BalanceDue - record.AmountToPaid : 0m
                });
            }

            return result.ToList();
        }
        
        public async Task<object> GetBillItemsPayments(Guid academicYearId, Guid termId, Guid classId, DateTime startDate, DateTime endDate)
        {
            //====================================================
            // Bills
            //====================================================

            var bills = await _billRepository.GetAllListAsync(x =>
                !x.IsCancelled &&
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.ClassId == classId &&
                x.BillDate.Date >= startDate.Date &&
                x.BillDate.Date <= endDate.Date);

            if (!bills.Any())
                return new List<BillItemPaymentDto>();


            //====================================================
            // Student Bill Infos
            //====================================================

            var studentBillInfos = await _studentBillInfoRepository.GetAllListAsync(x =>
                !x.IsCanceled &&
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.ClassId == classId);

            var studentBillLookup = studentBillInfos.ToDictionary(
                x => (x.BillId, x.StudentId));


            //====================================================
            // Fee Items
            //====================================================

            var standardItems = await _standardFeeItemRepository.GetAllListAsync();
            var boardingItems = await _boardingItemRepository.GetAllListAsync();
            var supplementaryItems = await _supItemRepository.GetAllListAsync();

            var standardDict = standardItems.ToDictionary(x => x.Id);
            var boardingDict = boardingItems.ToDictionary(x => x.Id);
            var supplementaryDict = supplementaryItems.ToDictionary(x => x.Id);


            //====================================================
            // Grand Total
            //====================================================

            decimal grandTotal = 0;

            foreach (var bill in bills)
            {
                var billedStudents = bill.Students
                    .Where(x => x.ToBeBilled)
                    .ToList();

                foreach (var detail in bill.Details)
                {
                    grandTotal += detail.Amount * billedStudents.Count;
                }
            }


            //====================================================
            // Result
            //====================================================

            var result = new List<BillItemPaymentDto>();


            foreach (var bill in bills)
            {
                var billedStudents = bill.Students
                    .Where(x => x.ToBeBilled)
                    .ToList();


                foreach (var detail in bill.Details)
                {
                    decimal totalAmount = detail.Amount * billedStudents.Count;

                    decimal amountPaid = 0;


                    foreach (var student in billedStudents)
                    {
                        if (!studentBillLookup.TryGetValue((bill.Id, student.StudentId), out var studentBill))
                            continue;


                        decimal studentBillAmount = student.IsDiscounted
                            ? student.Amount - student.DiscountAmount
                            : student.Amount;


                        if (studentBillAmount <= 0)
                            continue;


                        decimal ratio = detail.Amount / studentBillAmount;

                        amountPaid += studentBill.AmountPaid * ratio;
                    }


                    var feeItem = result.FirstOrDefault(x => x.FeeItemId == detail.FeeItemId);

                    if (feeItem == null)
                    {
                        feeItem = new BillItemPaymentDto
                        {
                            FeeItemId = detail.FeeItemId,
                            FeeItemName = GetFeeItemDescription(
                                bill.BillTypeId,
                                detail.FeeItemId,
                                standardDict,
                                boardingDict,
                                supplementaryDict),

                            TotalAmount = 0,
                            AmountPaid = 0
                        };

                        result.Add(feeItem);
                    }

                    feeItem.TotalAmount += totalAmount;
                    feeItem.AmountPaid += amountPaid;
                }
            }


            //====================================================
            // Calculate Balance & Percentage
            //====================================================

            foreach (var item in result)
            {
                item.Balance = item.TotalAmount - item.AmountPaid;

                item.Percentage = grandTotal == 0
                    ? 0
                    : Math.Round((item.TotalAmount / grandTotal) * 100, 2);
            }


            return result
                .OrderBy(x => x.FeeItemName)
                .ToList();
        }
        
        
        public async Task<object> GetStudentBills(Guid academicYearId, Guid termId, Guid classId)
        {
            //====================================================
            // Bills
            //====================================================

            var bills = await _billRepository.GetAllListAsync(x =>
                !x.IsCancelled &&
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.ClassId == classId);

            if (!bills.Any())
                return new List<StudentBillItemPaymentDto>();


            //====================================================
            // Student Bill Infos
            //====================================================

            var studentBillInfos = await _studentBillInfoRepository.GetAllListAsync(x =>
                !x.IsCanceled &&
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.ClassId == classId);

            var studentBillLookup = studentBillInfos.ToDictionary(
                x => (x.BillId, x.StudentId));


            //====================================================
            // Students
            //====================================================

            var students = await _studentInfoRepository.GetAllListAsync();

            var studentLookup = students.ToDictionary(x => x.Id);


            //====================================================
            // Fee Items
            //====================================================

            var standardItems = await _standardFeeItemRepository.GetAllListAsync();
            var boardingItems = await _boardingItemRepository.GetAllListAsync();
            var supplementaryItems = await _supItemRepository.GetAllListAsync();

            var standardDict = standardItems.ToDictionary(x => x.Id);
            var boardingDict = boardingItems.ToDictionary(x => x.Id);
            var supplementaryDict = supplementaryItems.ToDictionary(x => x.Id);


            //====================================================
            // Grand Total
            //====================================================

            decimal grandTotal = 0;

            foreach (var bill in bills)
            {
                var billedStudents = bill.Students
                    .Where(x => x.ToBeBilled)
                    .ToList();

                foreach (var student in billedStudents)
                {
                    foreach (var detail in bill.Details)
                    {
                        grandTotal += detail.Amount;
                    }
                }
            }
            //====================================================
            // Result
            //====================================================

            var result = new List<StudentBillItemPaymentDto>();


            foreach (var bill in bills)
            {
                var billedStudents = bill.Students
                    .Where(x => x.ToBeBilled)
                    .ToList();

                foreach (var student in billedStudents)
                {
                    if (!studentLookup.TryGetValue(student.StudentId, out var studentInfo))
                        continue;

                    if (!studentBillLookup.TryGetValue((bill.Id, student.StudentId), out var studentBill))
                        continue;

                    decimal studentBillAmount = student.Amount;

                    if (studentBillAmount <= 0)
                        continue;

                    var studentName = string.Join(" ", new[]
                    {
                        studentInfo.FirstName,
                        studentInfo.OtherName,
                        studentInfo.LastName
                    }.Where(x => !string.IsNullOrWhiteSpace(x)));

                    foreach (var detail in bill.Details)
                    {
                        decimal ratio = detail.Amount / studentBillAmount;

                        decimal amountPaid = studentBill.AmountPaid * ratio;

                        result.Add(new StudentBillItemPaymentDto
                        {
                            StudentId = student.StudentId,

                            StudentName = studentName,

                            RegNo = studentInfo.StudentIdentifier,

                            FeeItemId = detail.FeeItemId,

                            FeeItemName = GetFeeItemDescription(
                                bill.BillTypeId,
                                detail.FeeItemId,
                                standardDict,
                                boardingDict,
                                supplementaryDict),

                            Amount = detail.Amount,

                            AmountPaid = Math.Round(amountPaid, 2),

                            Balance = Math.Round(detail.Amount - amountPaid, 2),

                            Percentage = grandTotal == 0 ? 0 : Math.Round((detail.Amount / grandTotal) * 100, 2),
                            FeeType = bill.BillTypeId switch
                            {
                                1 => "Standard",
                                2 => "Supplementary",
                                3 => "Boarding",
                                _ => ""
                            } 
                        });
                    }
                }
            }

            return result
                .OrderBy(x => x.StudentName)
                .ThenBy(x => x.FeeItemName)
                .ToList();
        }
        
        
        public async Task<List<FeeSetupItemDto>> GetFeeSetupItems(Guid academicYearId, Guid termId, Guid classId)
{
    //==================================================
    // Fee Setups
    //==================================================

    var feeSetups = await _feeSetUpRepository.GetAllListAsync(x =>
        x.AcademicYearId == academicYearId &&
        x.TermId == termId &&
        x.ClassId == classId);

    //==================================================
    // Boarding Fee
    //==================================================

    var boardingFee = await _boardingFeeSetUpRepository.FirstOrDefaultAsync(x =>
        x.AcademicYearId == academicYearId &&
        x.TermId == termId &&
        x.ClassId == classId);

    //==================================================
    // Load Fee Items
    //==================================================

    var standardItems = await _standardFeeItemRepository.GetAllListAsync();
    var supplementaryItems = await _supItemRepository.GetAllListAsync();
    var boardingItems = await _boardingItemRepository.GetAllListAsync();

    var standardDict = standardItems.ToDictionary(x => x.Id);
    var supplementaryDict = supplementaryItems.ToDictionary(x => x.Id);
    var boardingDict = boardingItems.ToDictionary(x => x.Id);

    var result = new List<FeeSetupItemDto>();

    //==================================================
    // Standard & Supplementary
    //==================================================

    foreach (var setup in feeSetups)
    {
        foreach (var detail in setup.Details)
        {
            string itemName = "N/A";

            if (setup.FeeType.Equals("Standard", StringComparison.OrdinalIgnoreCase))
            {
                if (standardDict.TryGetValue(detail.FeesItemId, out var item))
                    itemName = item.Description;
            }
            else if (setup.FeeType.Equals("Supplementary", StringComparison.OrdinalIgnoreCase))
            {
                if (supplementaryDict.TryGetValue(detail.FeesItemId, out var item))
                    itemName = $"{item.Name} (Supplementary)";
            }

            result.Add(new FeeSetupItemDto
            {
                FeeItemId = detail.FeesItemId,
                ItemName = itemName,
                Amount = detail.Amount,
                FeeType = setup.FeeType
            });
        }
    }

    //==================================================
    // Boarding
    //==================================================

    if (boardingFee != null)
    {
        foreach (var detail in boardingFee.Details)
        {
            string itemName = "N/A";

            if (boardingDict.TryGetValue(detail.BoardingItemId, out var item))
            {
                itemName = $"{item.Name} (Boarding)";
            }

            result.Add(new FeeSetupItemDto
            {
                FeeItemId = detail.BoardingItemId,
                ItemName = itemName,
                Amount = detail.Amount,
                FeeType = "Boarding"
            });
        }
    }

    return result
        .OrderBy(x => x.FeeType)
        .ThenBy(x => x.ItemName)
        .ToList();
}
        public async Task<List<StudentDebtorDto>> GetStudentAccountStatus(Guid classId, DateTime asAtDate)
            {
                // Get all student bills up to the selected date
                var studentBills = await _studentBillInfoRepository
                    .GetAll()
                    .Where(x =>
                        !x.IsCanceled &&
                        x.ClassId == classId &&
                        x.CreationTime.Date <= asAtDate.Date
                    )
                    .GroupBy(x => new
                    {
                        x.StudentId,
                        x.ClassId
                    })
                    .Select(x => new
                    {
                        x.Key.StudentId,
                        x.Key.ClassId,

                        TotalBillAmount = x.Sum(y => y.Amount),

                        TotalPaid = x.Sum(y => y.AmountPaid),

                        BalanceDue = x.Sum(y => y.BalanceDue)
                    })
                    .ToListAsync();


                // Load students
                var studentIds = studentBills
                    .Select(x => x.StudentId)
                    .ToList();


                var students = await _studentInfoRepository
                    .GetAllListAsync(x =>
                        studentIds.Contains(x.Id)
                    );


                // Load classes
                var levelClasses = await _levelClassRepository
                    .GetAllListAsync();

                var classes = await _classRepository
                    .GetAllListAsync();

                var streams = await _streamRepository
                    .GetAllListAsync();



                var result = studentBills.Select(x =>
                {
                    var student = students
                        .FirstOrDefault(s => s.Id == x.StudentId);


                    var levelClass = levelClasses
                        .FirstOrDefault(l => l.Id == x.ClassId);


                    string studentClass = "";

                    if (levelClass != null)
                    {
                        var className = classes
                            .FirstOrDefault(c => c.Id == levelClass.ClassId)
                            ?.Name;

                        var streamName = streams
                            .FirstOrDefault(s => s.Id == levelClass.StreamId)
                            ?.Name;


                        studentClass = $"{className} {streamName}";
                    }


                    return new StudentDebtorDto
                    {
                        StudentId = x.StudentId,

                        StudentIdentifier = student?.StudentIdentifier,

                        StudentName = student == null 
                            ? "" 
                            : $"{student.LastName} {student.FirstName} {student.OtherName}",

                        StudentClass = studentClass,

                        TotalBillAmount = x.TotalBillAmount,

                        TotalPaid = x.TotalPaid,

                        BalanceDue = x.BalanceDue,

                        Type = x.BalanceDue > 0 
                            ? "Debtors" 
                            : "PaidUps"
                    };

                })
                .OrderByDescending(x => x.BalanceDue)
                .ToList();


                return result;
            }
            
        
         public async Task<object> GetOpeningBalances()
        {
            var balance = await _balances.GetAllListAsync();
            
            var result = new List<object>();

            foreach (var record in balance)
            {
                var currency = await _currencyRepository.FirstOrDefaultAsync(c => c.Id == record.CurrencyId);
                var currencyName = currency != null ? currency.CurrencyName : "N/A";
                var currencyCode = currency != null ? currency.CurrencyCode : "N/A";
               
            
                var student = await _studentInfoRepository.FirstOrDefaultAsync(record.StudentId);
                var studentName = student != null ? $"{student.FirstName} {student.OtherName} {student.LastName}".Trim() : "Unknown Student";
                var regNo = student != null ? student.StudentIdentifier : "Unknown RegNo";
                var className = "";
                if (student != null)
                {
                    var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);
                    var streamName = classInfo != null ? await _smEmailManager.GetStreamName(classInfo.StreamId) : "";
                    var mainClassName = classInfo != null ? await _smEmailManager.GetClassName(classInfo.ClassId) : "";
                    className = $"{mainClassName} {streamName}".Trim();
                }
                

                result.Add(new 
                {
                    StudentId = student?.Id,
                    StudentName = studentName,
                    RegNo = regNo,
                    ClassId = record.ClassId,
                    ClassName = className,
                    Date = record.Date.ToString("dd-MMM-yyyy"),
                    CurrencyName = currencyName,
                    CurrencyCode = currencyCode,
                    Amount     = record.Amount,
                    Balance = student?.BalanceDue ?? 0m
                });
            }

            return result.ToList();
        }
        public async Task<object> GetClassOpeningBalances()
        {
            var balances = await _balances.GetAllListAsync();

            var currencies = await _currencyRepository.GetAllListAsync();
            var levelClasses = await _levelClassRepo.GetAllListAsync();


            var result = balances
                .GroupBy(x => new
                {
                    x.ClassId,
                    x.CurrencyId
                })
                .Select(x =>
                {
                    var currency = currencies
                        .FirstOrDefault(c => c.Id == x.Key.CurrencyId);

                    var classInfo = levelClasses
                        .FirstOrDefault(c => c.Id == x.Key.ClassId);


                    var streamName = classInfo != null
                        ? _smEmailManager.GetStreamName(classInfo.StreamId).Result
                        : "";

                    var mainClassName = classInfo != null
                        ? _smEmailManager.GetClassName(classInfo.ClassId).Result
                        : "";


                    return new
                    {
                        ClassId = x.Key.ClassId,

                        ClassName = $"{mainClassName} {streamName}".Trim(),

                        Date = x.Max(y => y.Date)
                            .ToString("dd-MMM-yyyy"),

                        CurrencyName = currency?.CurrencyName ?? "N/A",

                        CurrencyCode = currency?.CurrencyCode ?? "N/A",

                        Amount = x.Sum(y => y.Amount),

                        Balance = x.Sum(y => y.Amount)
                    };
                })
                .OrderBy(x => x.ClassName)
                .ToList();


            return result;
        }
        
          public async Task<object> GetCreditMemo(DateTime startDate, DateTime endDate)
                {
                    var payments = await _schCreditMemoRepository.GetAllListAsync(s => s.Date >= startDate && s.Date <= endDate && !s.IsCanceled);
                    if (payments == null || payments.Count == 0)
                    {
                        return new { code = 404, message = "Payment not found." };
                    }
                
        
                    var result = new List<object>();
        
                    foreach (var record in payments)
                    {
        
                   
                        var currency = await _currencyRepository.FirstOrDefaultAsync(c => c.Id == record.CurrencyId);
                        var currencyName = currency != null ? currency.CurrencyName : "Ghana Cedis";
                        var currencyCode = currency != null ? currency.CurrencyCode : "GHS";
                        string userName = "";
                        if (_abpSession.UserId.HasValue)
                        {
                            var user = await _userRepository.FirstOrDefaultAsync(_abpSession.UserId.Value);
                            userName = user?.Name ?? "Unknown";
                        }
                    
                        var student = await _studentInfoRepository.FirstOrDefaultAsync(record.StudentId);
                        var studentName = student != null ? $"{student.FirstName} {student.OtherName} {student.LastName}".Trim() : "Unknown Student";
                        var regNo = student != null ? student.StudentIdentifier : "Unknown RegNo";
                        var className = "";
                        if (student != null)
                        {
                            var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);
                            var streamName = classInfo != null ? await _smEmailManager.GetStreamName(classInfo.StreamId) : "";
                            var mainClassName = classInfo != null ? await _smEmailManager.GetClassName(classInfo.ClassId) : "";
                            className = $"{mainClassName} {streamName}".Trim();
                        }
                    
                        var paymentMethodPath = Path.Combine(
                            _webHostEnvironment.WebRootPath,
                            "jsonDataSample",
                            "paymentMethods.json");
        
                        var paymentMethodsJson = await File.ReadAllTextAsync(paymentMethodPath);
        
                        var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(paymentMethodsJson)
                                             ?? new List<PaymentMethodDto>();
        
                        var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == record.PaymentMethod);
                        var paymentMethodName = paymentMethod != null ? paymentMethod.Name : "N/A";
        
                        var banks = await _bankRepository.GetAllListAsync();
                        var bank = banks.FirstOrDefault(x => x.Id == record.BankId);
                        var bankName = bank?.Name ?? "";
        
                        // get branches from bank <branches> — guard against bank being null
                        var bankBranchName = "";
                        if (bank != null && bank.BankBranches != null)
                        {
                            var bankBranch = bank.BankBranches.FirstOrDefault(x => x.Id == record.BankBranchId);
                            bankBranchName = bankBranch != null ? bankBranch.Name : "";
                        }
        
                        result.Add(new 
                        {
                            StudentId = student?.Id,
                            StudentName = studentName,
                            RegNo = regNo,
                            ClassName = className,
                            UserName = userName,
                            Date = record.Date.ToString("dd-MMM-yyyy"),
                            CurrencyName = currencyName,
                            CurrencyCode = currencyCode,
                            Amount     = record.AmountToCredit,
                            ModeOfPayment  = paymentMethodName,
                            ChequeNo = string.IsNullOrWhiteSpace(record.ChequeNumber) ? paymentMethodName : record.ChequeNumber,
                            BankDetail       = !string.IsNullOrEmpty(bankName) ? $"{bankName} - {bankBranchName}" : "",
                            ReceiptNo      = record.ReceiptNumber,
                            BankId         = bank?.Id,
                        });
                    }
        
                    return result.ToList();
                }
          
            public async Task<object> GetCanceledCreditMemo(Guid academicYearId, Guid termId)
            {
            var cancelledPayments = await _schCreditMemoRepository.GetAllListAsync(x =>
                x.AcademicYearId == academicYearId &&
                x.TermId == termId &&
                x.IsCanceled);

            if (!cancelledPayments.Any())
            {
                return new
                {
                    code = 404,
                    message = "No cancelled memos found."
                };
            }

            var result = new List<object>();

            foreach (var payment in cancelledPayments)
            {
                var student = await _studentInfoRepository.FirstOrDefaultAsync(payment.StudentId);

                if (student == null)
                    continue;

                var studentName = string.Join(" ", new[]
                {
                    student.FirstName,
                    student.OtherName,
                    student.LastName
                }.Where(x => !string.IsNullOrWhiteSpace(x)));

                var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);

                var streamName = classInfo != null
                    ? await _smEmailManager.GetStreamName(classInfo.StreamId)
                    : "";

                var mainClassName = classInfo != null
                    ? await _smEmailManager.GetClassName(classInfo.ClassId)
                    : "";

                var className = $"{mainClassName} {streamName}".Trim();
                var paymentMethodPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "paymentMethods.json");

                var paymentMethodsJson = await File.ReadAllTextAsync(paymentMethodPath);

                var paymentMethods = JsonConvert.DeserializeObject<List<PaymentMethodDto>>(paymentMethodsJson)
                                     ?? new List<PaymentMethodDto>();

                var paymentMethod = paymentMethods.FirstOrDefault(x => x.Id == payment.PaymentMethod);
                var paymentMethodName = paymentMethod != null ? paymentMethod.Name : "N/A";
        
                var academicYear = await _academicYearRepository.FirstOrDefaultAsync(academicYearId);

                var termsPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "terms.json");

                var termsJson = await File.ReadAllTextAsync(termsPath);

                var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                            ?? new List<TermDto>();

                var term = terms.FirstOrDefault(x => x.Id == termId);

                var period = $"{academicYear?.Name} - {term?.Name}";
                result.Add(new
                {
                    creditId = payment.Id,
                    receiptNo = payment.ReceiptNumber,
                    period,
                    date = payment.Date.ToString("dd-MMM-yyyy"),
                    studentName,
                    regNo = student.StudentIdentifier,
                    className,
                    amount = payment.AmountToCredit,
                    cancelledDate = payment.CanceledDate.ToString("dd-MMM-yyyy HH:mm"),
                    cancelledBy = payment.CanceledBy,
                    chequeNo = string.IsNullOrWhiteSpace(payment.ChequeNumber) ? paymentMethodName : payment.ChequeNumber,
                    paymentMethod = paymentMethodName,
                    Currency = (await _currencyRepository.FirstOrDefaultAsync(payment.CurrencyId))?.CurrencyName ?? "N/A",
                });
            }

            return new
            {
                code = 200,
                totalCancelledPayments = result.Count,
                totalCancelledAmount = cancelledPayments.Sum(x => x.AmountToCredit),
                data = result.OrderByDescending(x => ((dynamic)x).date)
            };
        }
}

