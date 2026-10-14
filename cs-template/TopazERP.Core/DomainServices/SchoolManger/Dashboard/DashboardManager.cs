using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.UI;
using Microsoft.EntityFrameworkCore;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.Dashboard;

public class DashboardManager: Abp.Domain.Services.DomainService, IDashboardManager
{
    private readonly IRepository<StudentBillInfo, Guid> _studentBillInfoRepository;
    private readonly IRepository<StudentInfo, Guid> _studentInfo;
    private readonly IRepository<SchPayment, Guid> _repositoryPayment;
    private readonly IRepository<AcademicYear, Guid> _repositoryAcademicYear;
    private readonly IRepository<AcademicYearTerm, Guid> _repositoryAcademicYearTerm;
    private readonly IRepository<SchoolProfile, Guid> _profileRepo;
    private readonly IRepository<Currency, Guid> _currencyRepository;
    private readonly IRepository<Class, Guid> _classRepository;
    private readonly IRepository<Stream, Guid> _streamRepository;
    private readonly IRepository<LevelClass, Guid> _levelClassRepository;

    public DashboardManager(IRepository<StudentBillInfo, Guid> studentBillInfoRepository, IRepository<SchPayment, Guid> repositoryPayment, IRepository<AcademicYear, Guid> repositoryAcademicYear, IRepository<AcademicYearTerm, Guid> repositoryAcademicYearTerm, IRepository<SchoolProfile, Guid> profileRepo, IRepository<Currency, Guid> currencyRepository, IRepository<StudentInfo, Guid> studentInfo, IRepository<Class, Guid> classRepository, IRepository<Stream, Guid> streamRepository, IRepository<LevelClass, Guid> levelClassRepository)
    {
        _studentBillInfoRepository = studentBillInfoRepository;
        _repositoryPayment = repositoryPayment;
        _repositoryAcademicYear = repositoryAcademicYear;
        _repositoryAcademicYearTerm = repositoryAcademicYearTerm;
        _profileRepo = profileRepo;
        _currencyRepository = currencyRepository;
        _studentInfo = studentInfo;
        _classRepository = classRepository;
        _streamRepository = streamRepository;
        _levelClassRepository = levelClassRepository;
    }
    public async Task<FinanceDashboardDto> GetFinanceDashboard()
{
    // Get active academic year
    var academicYear = await _repositoryAcademicYear
        .FirstOrDefaultAsync(x => x.IsActive);

    if (academicYear == null)
    {
        throw new UserFriendlyException("No active academic year found.");
    }


    // Get current term based on today's date
    var today = DateTime.Now.Date;

    var academicTerm = await _repositoryAcademicYearTerm
        .FirstOrDefaultAsync(x =>
            x.AcademicYearId == academicYear.Id &&
            x.StartDate.Date <= today &&
            x.EndDate.Date >= today);


    if (academicTerm == null)
    {
        throw new UserFriendlyException("No active term found for the current date.");
    }


    // Get school currency
    var schoolProfile = await _profileRepo.FirstOrDefaultAsync(x => true);

    var currency = schoolProfile != null
        ? await _currencyRepository.FirstOrDefaultAsync(schoolProfile.CurrencyId)
        : null;



    // ==========================
    // Bills
    // ==========================

    var billsRaised = await _studentBillInfoRepository
        .GetAll()
        .Where(x =>
            x.AcademicYearId == academicYear.Id &&
            x.TermId == academicTerm.TermId &&
            !x.IsCanceled)
        .SumAsync(x => (decimal?)x.Amount) ?? 0;



    var outstandingDebt = await _studentBillInfoRepository
        .GetAll()
        .Where(x =>
            x.AcademicYearId == academicYear.Id &&
            x.TermId == academicTerm.TermId &&
            !x.IsCanceled)
        .SumAsync(x => (decimal?)x.BalanceDue) ?? 0;



    // ==========================
    // Payments
    // ==========================

    var payments = await _repositoryPayment
        .GetAll()
        .Where(x =>
            x.AcademicYearId == academicYear.Id &&
            x.TermId == academicTerm.TermId &&
            !x.IsCanceled)
        .ToListAsync();



    decimal paymentsReceived = 0;
    decimal todaysCollections = 0;
    decimal monthlyCollections = 0;


    foreach (var payment in payments)
    {
        decimal amount;
        // Convert foreign currency payments
        if (payment.BuyRate > 0)
        {
            amount = payment.AmountToPaid * payment.BuyRate;
        }
        else
        {
            amount = payment.AmountToPaid;
        }


        paymentsReceived += amount;


        // Today's collections
        if (payment.PaymentDate.Date == today)
        {
            todaysCollections += amount;
        }


        // Current month collections
        if (payment.PaymentDate.Month == today.Month &&
            payment.PaymentDate.Year == today.Year)
        {
            monthlyCollections += amount;
        }
    }



    // ==========================
    // Collection Percentage
    // ==========================

    decimal collectionRate = 0;

    if (billsRaised > 0)
    {
        collectionRate = Math.Round(
            (paymentsReceived / billsRaised) * 100,
            2
        );
    }



    return new FinanceDashboardDto
    {
        CurrencyCode = currency?.CurrencyCode ?? "",

        BillsRaised = Math.Round(billsRaised, 2),

        PaymentsReceived = Math.Round(paymentsReceived, 2),

        OutstandingDebt = Math.Round(outstandingDebt, 2),

        CollectionRate = collectionRate,

        TodaysCollections = Math.Round(todaysCollections, 2),

        MonthlyCollections = Math.Round(monthlyCollections, 2)
    };
}
    public async Task<List<StudentDebtorDto>> GetStudentDebtors(Guid classId)
    {
    // Get debtor bills
    var debtorBills = await _studentBillInfoRepository
        .GetAll()
        .Where(x =>
            !x.IsCanceled &&
            x.BalanceDue > 0 &&
            x.ClassId == classId
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
    var studentIds = debtorBills
        .Select(x => x.StudentId)
        .ToList();


    var students = await _studentInfo
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



    var result = debtorBills.Select(x =>
    {

        var student = students
            .FirstOrDefault(s => s.Id == x.StudentId);



        var levelClass = levelClasses
            .FirstOrDefault(l =>
                l.Id == x.ClassId
            );


        string studentClass = "";

        if (levelClass != null)
        {
            var className = classes
                .FirstOrDefault(c =>
                    c.Id == levelClass.ClassId)
                ?.Name;


            var streamName = streams
                .FirstOrDefault(s =>
                    s.Id == levelClass.StreamId)
                ?.Name;


            studentClass = $"{className} {streamName}";
        }
        return new StudentDebtorDto
        {
            StudentId = x.StudentId,
            StudentIdentifier = student?.StudentIdentifier,
            StudentName = student == null ? "" : $"{student.LastName} {student.FirstName} {student.OtherName}",
            StudentClass = studentClass,
            TotalBillAmount = x.TotalBillAmount,
            TotalPaid = x.TotalPaid,
            BalanceDue = x.BalanceDue
        };

    })
    .OrderByDescending(x => x.BalanceDue)
    .ToList();
    return result;
}
}