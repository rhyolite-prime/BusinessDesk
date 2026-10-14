using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Net.Mail;
using Abp.UI;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Syncfusion.HtmlConverter;
using Syncfusion.Pdf;
using TopazERP.DomainServices.Ap.Reports;
using TopazERP.DomainServices.SchoolManger.Email.Dto;
using TopazERP.DomainServices.SchoolManger.Reports;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;
using TopazERP.Notifications.Dto;
using JsonSerializer = System.Text.Json.JsonSerializer;
using SchoolStream = TopazERP.Models.Sch.Stream;
using Stream = System.IO.Stream;


namespace TopazERP.DomainServices.SchoolManger.Email;

public class SmEmailManager: Abp.Domain.Services.DomainService, ISmEmailManager
{
    private readonly IRepository<StudentInfo, Guid> _studentRepo;
    private readonly IRepository<Class, Guid> _classRepo;
    private readonly IRepository<ClassAssignment, Guid> _assignmentRepo;
    private readonly IRepository<SubjectRemark, Guid> _remarkRepo;
    private readonly IRepository<Attendance, Guid> _attendanceRepo;
    private readonly IRepository<SchoolProfile, Guid> _profileRepo;
    private readonly IRepository<AcademicYear, Guid> _academicYearRepo;
    private readonly IRepository<AcademicYearTerm, Guid> _academicYearTermRepo;
    private readonly IRepository<AcademicYearTermDetail, Guid> _academicYearTermDetailRepo;
    private readonly IRepository<ClassLevelPercentage, Guid> _classLevelPercentageRepo;
    private readonly IRepository<ClassPromotion, Guid> _classPromotionRepo;
    private readonly IRepository<Level, Guid> _levelRepo;
    private readonly IRepository<LevelClass, Guid> _levelClassRepo;
    private readonly IRepository<Term, Guid> _termRepo;
    private readonly IRepository<Subject, Guid> _subjectRepo;
    private readonly IRepository<AssignedSubject, Guid> _assignedSubjectRepo;
    private readonly IRepository<SchoolStream, Guid> _streamRepo;
    private readonly IRepository<TeacherClass, Guid> _teacherClassRepo;
    private readonly IRepository<CumulativeAttendance, Guid> _cumulativeAttendanceRepo;
    private readonly IRepository<StaffBio, Guid> _staffBioRepo;
    private readonly IRepository<SubjectRemark, Guid> _subjectRemarkRepo;
    private readonly IRepository<BehavioralAssessment, Guid> _behavioralAssessmentRepo;
    private readonly IRepository<RemarksByTeacher, Guid> _teacherRemarkRepo;
    private readonly IRepository<RegisteredClass, Guid> _registeredClassRepo;
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly IRepository <MidTermAssessment, Guid> _midTermAssessmentRepo;
    private readonly IRepository<AssessmentRemarkHeader, Guid> _assessmentRemarkHeaderRepo;
    private readonly IRepository<StContactRelationship, Guid> _studentContactRelationshipRepo;
    private readonly IRepository<TeacherSubject, Guid> _teacherSubjectRepo;
    private readonly IRepository<Currency, Guid> _currencyRepository;
    private readonly IRepository<FeesDescription, Guid> _standardFeeItemRepository;
    private readonly IRepository<BoardingItem, Guid> _boardingItemRepository;
    private readonly IRepository<SupplementaryItem, Guid> _supItemRepository;
    private readonly IRepository<BillFooter, Guid> _billFooterRepository;
    private readonly IRepository<Bill, Guid> _billRepository;
    public SmEmailManager(IRepository<StudentInfo, Guid> studentRepo, IRepository<Class, Guid> classRepo, IRepository<ClassAssignment, Guid> assignmentRepo, IRepository<SubjectRemark, Guid> remarkRepo, IRepository<Attendance, Guid> attendanceRepo, IRepository<SchoolProfile, Guid> profileRepo, IRepository<AcademicYear, Guid> academicYearRepo, IRepository<AcademicYearTerm, Guid> academicYearTermRepo, IRepository<AcademicYearTermDetail, Guid> academicYearTermDetailRepo, IRepository<ClassLevelPercentage, Guid> classLevelPercentageRepo, IRepository<ClassPromotion, Guid> classPromotionRepo, IRepository<Level, Guid> levelRepo, IRepository<LevelClass, Guid> levelClassRepo, IRepository<Term, Guid> termRepo, IRepository<Subject, Guid> subjectRepo, IRepository<AssignedSubject, Guid> assignedSubjectRepo, IRepository<SchoolStream, Guid> streamRepo, IRepository<TeacherClass, Guid> teacherClassRepo, IRepository<CumulativeAttendance, Guid> cumulativeAttendanceRepo, IRepository<StaffBio, Guid> staffBioRepo, IRepository<SubjectRemark, Guid> subjectRemarkRepo, IRepository<BehavioralAssessment, Guid> behavioralAssessmentRepo, IRepository<RemarksByTeacher, Guid> teacherRemarkRepo, IRepository<RegisteredClass, Guid> registeredClassRepo, IWebHostEnvironment webHostEnvironment, IRepository<MidTermAssessment, Guid> midTermAssessmentRepo, IRepository<AssessmentRemarkHeader, Guid> assessmentRemarkHeaderRepo, IRepository<StContactRelationship, Guid> studentContactRelationshipRepo, IRepository<TeacherSubject, Guid> teacherSubjectRepo, IRepository<Currency, Guid> currencyRepository, IRepository<FeesDescription, Guid> standardFeeItemRepository, IRepository<BoardingItem, Guid> boardingItemRepository, IRepository<SupplementaryItem, Guid> supItemRepository, IRepository<BillFooter, Guid> billFooterRepository, IRepository<Bill, Guid> billRepository)
    {
        _studentRepo = studentRepo;
        _classRepo = classRepo;
        _assignmentRepo = assignmentRepo;
        _remarkRepo = remarkRepo;
        _attendanceRepo = attendanceRepo;
        _profileRepo = profileRepo;
        _academicYearRepo = academicYearRepo;
        _academicYearTermRepo = academicYearTermRepo;
        _academicYearTermDetailRepo = academicYearTermDetailRepo;
        _classLevelPercentageRepo = classLevelPercentageRepo;
        _classPromotionRepo = classPromotionRepo;
        _levelRepo = levelRepo;
        _levelClassRepo = levelClassRepo;
        _termRepo = termRepo;
        _subjectRepo = subjectRepo;
        _assignedSubjectRepo = assignedSubjectRepo;
        _streamRepo = streamRepo;
        _teacherClassRepo = teacherClassRepo;
        _cumulativeAttendanceRepo = cumulativeAttendanceRepo;
        _staffBioRepo = staffBioRepo;
        _subjectRemarkRepo = subjectRemarkRepo;
        _behavioralAssessmentRepo = behavioralAssessmentRepo;
        _teacherRemarkRepo = teacherRemarkRepo;
        _registeredClassRepo = registeredClassRepo;
        _webHostEnvironment = webHostEnvironment;
        _midTermAssessmentRepo = midTermAssessmentRepo;
        _assessmentRemarkHeaderRepo = assessmentRemarkHeaderRepo;
        _studentContactRelationshipRepo = studentContactRelationshipRepo;
        _teacherSubjectRepo = teacherSubjectRepo;
        _currencyRepository = currencyRepository;
        _standardFeeItemRepository = standardFeeItemRepository;
        _boardingItemRepository = boardingItemRepository;
        _supItemRepository = supItemRepository;
        _billFooterRepository = billFooterRepository;
        _billRepository = billRepository;
    }
    public async Task SendWithCompanyCredentials(EmailMessage email, SmtpCredentials creds)
    {
        using var client = new SmtpClient(creds.MailHostName, creds.PortNumber)
        {
            Credentials = new NetworkCredential(creds.PrimaryEmailAddress, creds.EmailPassword),
            EnableSsl = creds.IsSSLEnabled
        };

        var mail = new MailMessage
        {
            From = new MailAddress(creds.PrimaryEmailAddress, creds.DefaultFromDisplayName),
            Subject = email.Subject,
            Body = email.Body,
            IsBodyHtml = true
        };

        foreach (var recipient in email.To)
            mail.To.Add(recipient);
            
        foreach (var attachment in email.Attachments)
        {
            var stream = new MemoryStream(attachment.Content);
            mail.Attachments.Add(new Attachment(stream, attachment.FileName, attachment.MimeType));
        }

        await client.SendMailAsync(mail);
    }

    private async Task<string> GetTeacherFullNameAsync(Guid teacherId)
    {
        var teacher = await _staffBioRepo.FirstOrDefaultAsync(teacherId);

        if (teacher == null)
            return string.Empty;

        return string.Join(" ",
            new[]
                {
                    teacher.LastName,
                    teacher.FirstName,
                    teacher.OtherName
                }
                .Where(n => !string.IsNullOrWhiteSpace(n))
        );
    }

    private async Task<string> GetStudentFullNameAsync(Guid studentId)
    {
        var teacher = await _studentRepo.FirstOrDefaultAsync(studentId);

        if (teacher == null)
            return string.Empty;

        return string.Join(" ",
            new[]
                {
                    teacher.LastName,
                    teacher.FirstName,
                    teacher.OtherName
                }
                .Where(n => !string.IsNullOrWhiteSpace(n))
        );
    }

    private async Task<string> GetTeacherByClass(Guid academicYearId, Guid classId)
    {
        var registeredClass = await _registeredClassRepo.FirstOrDefaultAsync(c =>
            c.AcademicYearId == academicYearId &&
            c.ClassId == classId
        );

        if (registeredClass == null)
            return string.Empty;

        var teacherId = registeredClass.MainTeacherId;

        var teacherFullName = await GetTeacherFullNameAsync(teacherId);
        return teacherFullName;
    }

    private async Task<string> GetSubjectName(Guid subjectId)
    {
        var subjects = await _subjectRepo.FirstOrDefaultAsync(s => s.Id == subjectId);
        var subjectName = subjects.Name;
        return subjectName;
    }

   

    public async Task<string> GetClassName(Guid classId)
    {
        var classes = await _classRepo.FirstOrDefaultAsync(c => c.Id == classId);
        var className = classes.Name;
        return className;
    }
    

    public async Task<string> GetTermName(Guid termId)
    {
        var termsPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "terms.json"
        );


        var termsJson = await File.ReadAllTextAsync(termsPath);

        var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                    ?? new List<TermDto>();
        

        var term = terms?.FirstOrDefault(x => x.Id == termId);

        return term?.Name ?? string.Empty;
    }
    public class TermDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }

    public async Task<string> GetStreamName(Guid streamId)
    {
        var stream = await _streamRepo.FirstOrDefaultAsync(s => s.Id == streamId);
        var streamName = stream.Name;
        return streamName;
    }

    public async Task<string> GetAcademicYearName(Guid academicYearId)
    {
        var academicYear = await _academicYearRepo.FirstOrDefaultAsync(a => a.Id == academicYearId);
        var academicYearName = academicYear.Name;
        return academicYearName;
    }

    public async Task<string> GetLevelName(Guid levelId)
    {
       var level = await _levelRepo.FirstOrDefaultAsync(l => l.ActualLevelId == levelId );
       var levelName = level.ActualLevelName;
       return levelName;
    }

    private async Task<SubjectRemarkDto> GetSubjectRemark(decimal totalScore, string stage)
    {
        var lowerStage = stage.ToLower();

        var remark = await _subjectRemarkRepo.FirstOrDefaultAsync(r => 
            r.Stage.ToLower() == lowerStage &&
            totalScore >= r.MinMark &&
            totalScore <= r.MaxMark);

        if (remark == null)
            return null;

        return new SubjectRemarkDto
        {
            GradeNumber = remark.GradeNumber,
            Remark = remark.Remark,
            MinMark = remark.MinMark,
            MaxMark = remark.MaxMark
        };
    }
    // ===============================
    // All Stage Remarks
    // ===============================
    private async Task<IEnumerable<StageRemarkDto>> GetStageSubjectRemarks(string stage)
    {
        var lowerStage = stage.ToLower();
        var allRemarks = await _subjectRemarkRepo.GetAllListAsync();

        var stageRemarks = allRemarks
            .Where(r => r.Stage.ToLower() == lowerStage)
            .Select(r => new StageRemarkDto
            {
                MinMark = r.MinMark,
                MaxMark = r.MaxMark,
                GradeNumber = r.GradeNumber,
                Remark = r.Remark,
                Name = $"{r.MinMark} - {r.MaxMark} - {r.GradeNumber} - {r.Remark}"
            })
            .ToList();
        
        //sort by grade number highest to lowest
        stageRemarks = stageRemarks.OrderBy(r => r.GradeNumber).ToList();

        return stageRemarks;
    }
    
    // ===============================
    // Attendance
    // ===============================
    private async Task<int> GetAttendance(Guid studentId, Guid academicYearId, Guid classId, Guid termId)
    {
        var record = await _cumulativeAttendanceRepo.FirstOrDefaultAsync(a =>
            a.AcademicYearId == academicYearId &&
            a.ClassId == classId &&
            a.TermId == termId &&
            a.StudentId == studentId
        );

        return record?.Days ?? 0;
    }
    // ===============================
    // Behavioural Remark (Conduct / Attitude)
    // ===============================
    private async Task<string> GetBehaviouralRemark(string type, Guid studentId, Guid academicYearId, Guid classId)
    {
        var lowerType = type.ToLower();

        var record = await _behavioralAssessmentRepo.FirstOrDefaultAsync(a =>
            a.ClassId == classId &&
            a.AcademicYearId == academicYearId &&
            a.AssessmentType.ToLower() == lowerType
        );

        if (record == null || record.Assessments == null)
            return string.Empty;

        var studentAssessment = record.Assessments.FirstOrDefault(sa => sa.StudentId == studentId);
        return studentAssessment?.Description ?? string.Empty;
    }
    // ===============================
    // Class Teacher Remark
    // ===============================
    private async Task<string> GetClassTeacherRemark(Guid studentId, Guid classId, Guid academicYearId)
    {
        var allRemarks = await _teacherRemarkRepo.GetAllListAsync();

        var record = allRemarks
            .Where(r => r.RemarkType == "MidTerm" && r.TeacherType == "Class")
            .FirstOrDefault(r => r.ClassId == classId
                                 && r.StudentId == studentId
                                 && r.AcademicYearId == academicYearId);

        return record?.Remark ?? string.Empty;
    }
    // ===============================
    // Head Teacher Remark
    // ===============================
    private async Task<string> GetHeadTeacherRemark(Guid studentId, Guid classId, Guid academicYearId)
    {
        var allRemarks = await _teacherRemarkRepo.GetAllListAsync();
          
        var record = allRemarks
            .Where(r => r.RemarkType == "MidTerm" && r.TeacherType == "Head")
            .FirstOrDefault(r => r.ClassId == classId
                                 && r.StudentId == studentId
                                 && r.AcademicYearId == academicYearId);

        return record?.Remark ?? string.Empty;
    }
    public class RankingItem
    {
        public string StudentIdentifier { get; set; }
        public decimal Total { get; set; }
        public int Position { get; set; }
    }
    public static List<RankingItem> AssignPositions(List<RankingItem> items, bool isSplitting)
    {
        var ranked = new List<RankingItem>();
        items = items.OrderByDescending(x => x.Total).ToList();

        int position = 1;
        int sameRankCount = 0;
        decimal? prevScore = null;

        foreach (var item in items)
        {
            if (prevScore == null)
            {
                position = 1;
                sameRankCount = 1;
            }
            else if (item.Total == prevScore)
            {
                sameRankCount++;
            }
            else
            {
                position = isSplitting ? position + sameRankCount : position + 1;
                sameRankCount = 1;
            }

            prevScore = item.Total;
            ranked.Add(new RankingItem
            {
                StudentIdentifier = item.StudentIdentifier,
                Total = item.Total,
                Position = position
            });
        }

        return ranked;
    }

    private async Task<decimal> GetPreviousTermsAverage(
        Guid studentId,
        Guid classId,
        Guid academicYearId,
        Guid currentTermId)
    {
        var currentTerm = await _academicYearTermRepo.FirstOrDefaultAsync(t =>
            t.AcademicYearId == academicYearId &&
            t.TermId == currentTermId);

        if (currentTerm == null)
            return 0;


        // Get only the immediately previous term
        var previousTerm = (await _academicYearTermRepo.GetAllListAsync(t =>
                t.StartDate < currentTerm.StartDate))
            .OrderByDescending(t => t.StartDate)
            .FirstOrDefault();


        if (previousTerm == null)
            return 0;


        var previousAverage = await GetStudentOverallScoreForTerm(
            studentId,
            classId,
            previousTerm.AcademicYearId,
            previousTerm.TermId);


        return previousAverage ?? 0;
    }

/// <summary>
/// Computes the student's overall weighted score (class% + exam%, summed
/// across subjects) for a single academic year/term — same math used
/// per-subject in BuildTerminalReportAsync.
/// </summary>
private async Task<decimal?> GetStudentOverallScoreForTerm(
    Guid studentId,
    Guid classId,
    Guid academicYearId,
    Guid termId)
{
    var student = await _studentRepo.GetAsync(studentId);

    var classInfo = await _levelClassRepo.GetAsync(classId);
    var level = classInfo.LevelId;

    var yearPercentages = await _classLevelPercentageRepo.FirstOrDefaultAsync(p =>
        p.AcademicYearId == academicYearId);

    decimal classPercentage = 0;
    decimal examPercentage = 0;

    if (yearPercentages?.Details != null)
    {
        var levelMatch = yearPercentages.Details.FirstOrDefault(d => d.LevelId == level);
        classPercentage = levelMatch?.ClassPercentage ?? 0;
        examPercentage = levelMatch?.ExamPercentage ?? 0;
    }

    var assignments = await _assignmentRepo.GetAllListAsync(a =>
        a.ClassId == classId &&
        a.AcademicYearId == academicYearId &&
        a.TermId == termId);

    if (!assignments.Any())
        return null; // no records for this term — exclude from average

    decimal totalScore = 0;
    int subjectCount = 0;

    foreach (var subjectGroup in assignments.GroupBy(a => a.SubjectId))
    {
        decimal classObt = 0, classOver = 0;
        decimal examObt = 0, examOver = 0;

        foreach (var assessment in subjectGroup)
        {
            var detail = assessment.Details
                .FirstOrDefault(d => d.StudentIdentifier == student.StudentIdentifier);

            if (detail == null)
                continue;

            if (assessment.Type == "Exam")
            {
                examObt += detail.Marks;
                examOver += assessment.OverallMark;
            }
            else if (!assessment.Type.Equals("MidTerm", StringComparison.OrdinalIgnoreCase))
            {
                classObt += detail.Marks;
                classOver += assessment.OverallMark;
            }
        }

        var classPercent = classOver > 0 ? (classObt / classOver) * 100 : 0;
        var examPercent = examOver > 0 ? (examObt / examOver) * 100 : 0;

        var weightedClass = (classPercent / 100) * classPercentage;
        var weightedExam = (examPercent / 100) * examPercentage;

        totalScore += weightedClass + weightedExam;
        subjectCount++;
    }

    if (subjectCount == 0)
        return null;

    // average per subject, same as CurrentTermAverage
    return totalScore / subjectCount;
}

    public async Task<TerminalReportDto> BuildTerminalReportAsync(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        var student = await _studentRepo.GetAsync(studentId);

        var schoolProfile = await _profileRepo.FirstOrDefaultAsync(x => true);

        var isClassSplitting = schoolProfile.IsClassPosition;
        var isSubjectSplitting = schoolProfile.IsSubjectPosition;
        var displaySignature = schoolProfile.ShowSignatureOnResults;

        var classInfo = await _levelClassRepo.GetAsync(classId);

        var level = classInfo.LevelId;

        var levelInfo = await _levelRepo.GetAsync(level);

        var actualLevelId = levelInfo.ActualLevelId;

        var levelName = await GetLevelName(actualLevelId);

        var stage = !string.IsNullOrWhiteSpace(levelName) &&
                    (levelName.Contains("JHS", StringComparison.OrdinalIgnoreCase) ||
                     levelName.Contains("Junior High", StringComparison.OrdinalIgnoreCase))
            ? "JHS"
            : "Primary";

        var academicYearName = await GetAcademicYearName(academicYearId);

        var termName = await GetTermName(termId);

        var streamName = await GetStreamName(classInfo.StreamId);
        var period = $"{academicYearName} - {termName}";
        var mainClassName = await GetClassName(classInfo.ClassId);

        var className = $"{mainClassName} {streamName}".Trim();

        var teacherFullName = await GetTeacherByClass(academicYearId, classId);

        var classSubjects = await _assignedSubjectRepo.GetAllListAsync(s =>
            s.ClassId == classId &&
            s.AcademicYearId == academicYearId &&
            s.TermId == termId);
      

        var yearTerm = await _academicYearTermRepo.FirstOrDefaultAsync(t =>
            t.AcademicYearId == academicYearId &&
            t.TermId == termId);

        DateTime termEndDate = yearTerm?.EndDate ?? DateTime.MinValue;

        var assignments = await _assignmentRepo.GetAllListAsync(a =>
            a.ClassId == classId &&
            a.AcademicYearId == academicYearId &&
            a.TermId == termId);

        if (!assignments.Any())
            return new TerminalReportDto();

        /* ===========================
           CLASS / EXAM PERCENTAGES
        =========================== */

        var yearPercentages =
            await _classLevelPercentageRepo.FirstOrDefaultAsync(p =>
                p.AcademicYearId == academicYearId);

        decimal classPercentage = 0;
        decimal examPercentage = 0;

        if (yearPercentages?.Details != null)
        {
            var levelMatch = yearPercentages.Details
                .FirstOrDefault(d => d.LevelId == level);

            classPercentage = levelMatch?.ClassPercentage ?? 0;
            examPercentage = levelMatch?.ExamPercentage ?? 0;
        }

        /* ===========================
           STUDENTS IN THIS CLASS
        =========================== */

        var studentsInClass = (await _studentRepo.GetAllListAsync(s =>
            s.ClassId == classId &&
            !s.isAlumni))
    .ToList();

    /* ===========================
       STUDENTS IN MAIN CLASS
    =========================== */

    var allStudents = await _studentRepo.GetAllListAsync(s => !s.isAlumni);

    var allLevelClasses = await _levelClassRepo.GetAllListAsync();

    var studentsInMainClass = allStudents
        .Where(s =>
        {
            var lc = allLevelClasses
                .FirstOrDefault(c => c.Id == s.ClassId);

            return lc != null &&
                   lc.ClassId == classInfo.ClassId;
        })
        .ToList();

    /* ===========================
       BUILD RANKINGS
    =========================== */

    var studentTotals = new Dictionary<string, decimal>();

    var subjectRankings =
        new Dictionary<Guid, List<RankingItem>>();

    var subjectRankingsThisClass =
        new Dictionary<Guid, List<RankingItem>>();

    var classTotalsThisClass =
        new Dictionary<string, decimal>();

    foreach (var subjectGroup in assignments.GroupBy(a => a.SubjectId))
    {
        var subjectId = subjectGroup.Key;

        /* ===========================
           MAIN CLASS RANKING
        =========================== */

        var rankingList = new List<RankingItem>();

        foreach (var stu in studentsInMainClass)
        {
            decimal classObt = 0;
            decimal classOver = 0;

            decimal examObt = 0;
            decimal examOver = 0;

            foreach (var assessment in subjectGroup)
            {
                var detail = assessment.Details
                    .FirstOrDefault(d =>
                        d.StudentIdentifier == stu.StudentIdentifier);

                if (detail == null)
                    continue;

                if (assessment.Type == "Exam")
                {
                    examObt += detail.Marks;
                    examOver += assessment.OverallMark;
                }
                else if (!assessment.Type.Equals("MidTerm",
                             StringComparison.OrdinalIgnoreCase))
                {
                    classObt += detail.Marks;
                    classOver += assessment.OverallMark;
                }
            }

            var classPercent =
                classOver > 0
                    ? (classObt / classOver) * 100
                    : 0;

            var examPercent =
                examOver > 0
                    ? (examObt / examOver) * 100
                    : 0;

            var weightedClass =
                (classPercent / 100) * classPercentage;

            var weightedExam =
                (examPercent / 100) * examPercentage;

            var total = weightedClass + weightedExam;

            rankingList.Add(new RankingItem
            {
                StudentIdentifier = stu.StudentIdentifier,
                Total = total
            });

            if (!studentTotals.ContainsKey(stu.StudentIdentifier))
                studentTotals[stu.StudentIdentifier] = 0;

            studentTotals[stu.StudentIdentifier] += total;
        }

        subjectRankings[subjectId] =
            AssignPositions(rankingList, isSubjectSplitting);

        /* ===========================
           THIS CLASS RANKING
        =========================== */

        var thisClassRanking = new List<RankingItem>();

        foreach (var stu in studentsInClass)
        {
            decimal classObt = 0;
            decimal classOver = 0;

            decimal examObt = 0;
            decimal examOver = 0;

            foreach (var assessment in subjectGroup)
            {
                var detail = assessment.Details
                    .FirstOrDefault(d =>
                        d.StudentIdentifier == stu.StudentIdentifier);

                if (detail == null)
                    continue;

                if (assessment.Type == "Exam")
                {
                    examObt += detail.Marks;
                    examOver += assessment.OverallMark;
                }
                else if (!assessment.Type.Equals("MidTerm",
                             StringComparison.OrdinalIgnoreCase))
                {
                    classObt += detail.Marks;
                    classOver += assessment.OverallMark;
                }
            }

            var classPercent =
                classOver > 0
                    ? (classObt / classOver) * 100
                    : 0;

            var examPercent =
                examOver > 0
                    ? (examObt / examOver) * 100
                    : 0;

            var weightedClass =
                (classPercent / 100) * classPercentage;

            var weightedExam =
                (examPercent / 100) * examPercentage;

            var total = weightedClass + weightedExam;

            thisClassRanking.Add(new RankingItem
            {
                StudentIdentifier = stu.StudentIdentifier,
                Total = total
            });

            if (!classTotalsThisClass.ContainsKey(stu.StudentIdentifier))
                classTotalsThisClass[stu.StudentIdentifier] = 0;

            classTotalsThisClass[stu.StudentIdentifier] += total;
        }

        subjectRankingsThisClass[subjectId] =
            AssignPositions(thisClassRanking, isSubjectSplitting);
    }
   
       
    /*highest and lowest class marks*/
    var highestClassMarks = classTotalsThisClass.Any()
        ? classTotalsThisClass.Max(x => x.Value)
        : 0;
    var lowestClassMarks = classTotalsThisClass.Any()
        ? classTotalsThisClass.Min(x => x.Value)
        : 0;
    /* ===========================
       OVERALL CLASS POSITION
    =========================== */

    var overallRankingList = studentTotals
        .Select(kv => new RankingItem
        {
            StudentIdentifier = kv.Key,
            Total = kv.Value
        })
        .ToList();

    var rankedOverall =
        AssignPositions(overallRankingList, isClassSplitting);

    var overallPosition =
        rankedOverall
            .FirstOrDefault(x =>
                x.StudentIdentifier == student.StudentIdentifier)
            ?.Position ?? 0;

    /* ===========================
       CLASS POSITION (STREAM)
    =========================== */

    var streamRankingList = classTotalsThisClass
        .Select(kv => new RankingItem
        {
            StudentIdentifier = kv.Key,
            Total = kv.Value
        })
        .ToList();

    var rankedStream =
        AssignPositions(streamRankingList, isClassSplitting);

    var classPosition =
        rankedStream
            .FirstOrDefault(x =>
                x.StudentIdentifier == student.StudentIdentifier)
            ?.Position ?? 0;

    /* ===========================
       BUILD SUBJECT REPORT
    =========================== */

    var reportSubjects =
        new List<TerminalReportSubjectDto>();

    var subjectIds = classSubjects
        .SelectMany(cs => cs.Details)
        .Select(d => d.SubjectId)
        .Distinct()
        .ToList();
  
    foreach (var subjectId in subjectIds)
    {
        var subjectAssignments = assignments
            .Where(a => a.SubjectId == subjectId)
            .ToList();

        decimal classObt = 0;
        decimal classOver = 0;

        decimal examObt = 0;
        decimal examOver = 0;

        foreach (var assessment in subjectAssignments)
        {
            var detail = assessment.Details
                .FirstOrDefault(d =>
                    d.StudentIdentifier ==
                    student.StudentIdentifier);

            if (detail == null)
                continue;

            if (assessment.Type == "Exam")
            {
                examObt += detail.Marks;
                examOver += assessment.OverallMark;
            }
            else if (!assessment.Type.Equals("MidTerm",
                         StringComparison.OrdinalIgnoreCase))
            {
                classObt += detail.Marks;
                classOver += assessment.OverallMark;
            }
        }

        var classPercent =
            classOver > 0
                ? (classObt / classOver) * 100
                : 0;

        var examPercent =
            examOver > 0
                ? (examObt / examOver) * 100
                : 0;

        var weightedClass =
            (classPercent / 100) * classPercentage;

        var weightedExam =
            (examPercent / 100) * examPercentage;

        var total =
            weightedClass + weightedExam;

        /* SUBJECT POSITION THIS CLASS */

        int subjectPosition = 0;

        if (subjectRankingsThisClass.ContainsKey(subjectId))
        {
            subjectPosition =
                subjectRankingsThisClass[subjectId]
                    .FirstOrDefault(x =>
                        x.StudentIdentifier ==
                        student.StudentIdentifier)
                    ?.Position ?? 0;
        }

        /* OVERALL SUBJECT POSITION */

        int overallSubjectPosition = 0;

        if (subjectRankings.ContainsKey(subjectId))
        {
            overallSubjectPosition =
                subjectRankings[subjectId]
                    .FirstOrDefault(x =>
                        x.StudentIdentifier ==
                        student.StudentIdentifier)
                    ?.Position ?? 0;
        }

        /* CLASS AVERAGE */

        decimal classAveragePerSubject = 0;

        if (subjectRankings.ContainsKey(subjectId) &&
            subjectRankings[subjectId].Any())
        {
            classAveragePerSubject =
                subjectRankings[subjectId]
                    .Average(x => x.Total);
        }

        var remark =
            await GetSubjectRemark(total, stage);

        /* SUBJECT TEACHER */

        string subjectTeacherName = string.Empty;

        var teacherSubject =
            await _teacherSubjectRepo.FirstOrDefaultAsync(t =>
                t.SubjectId == subjectId);

        if (teacherSubject != null)
        {
            subjectTeacherName =
                await GetTeacherFullNameAsync(
                    teacherSubject.StaffId);
        }

        var finalTotalScore =
            (classPercent == 0 ||
             examPercent == 0 ||
             remark == null)
                ? 0
                : total;

        reportSubjects.Add(new TerminalReportSubjectDto
        {
            SubjectId = subjectId,

            SubjectName =
                await GetSubjectName(subjectId),

            SubjectTeacher = subjectTeacherName,

            ClassScoreObtained = classObt,
            ClassScoreOverall = classOver,

            ExamScoreObtained = examObt,
            ExamScoreOverall = examOver,

            PercentageClassScore = weightedClass,

            PercentageExam = weightedExam,

            TotalScore = finalTotalScore,

            GradeNumber = remark?.GradeNumber,

            SubjectRemark = remark?.Remark,

            PositionPerSubject = subjectPosition,

            OverallSubjectPosition =
                overallSubjectPosition,

            ClassAveragePerSubject =
                classAveragePerSubject
        });
    }

    reportSubjects =
        reportSubjects
            .OrderBy(x => x.SubjectName)
            .ToList();
    
    /* current terms average*/
    var currentTermAverage = reportSubjects.Any()
        ? reportSubjects.Sum(s => s.TotalScore) / reportSubjects.Count
        : 0;
    /*total marks expected*/
    var totalMarks = 100 * reportSubjects.Count;
    /* ===========================
       AGGREGATE / RAW SCORE
    =========================== */

    int aggregate = 0;
    decimal rawScore = 0;

    var normalizedStage =
        stage.Trim().ToLower();

    if (normalizedStage == "jhs" ||
        normalizedStage.Contains("junior high"))
    {
        var allSubjects =
            await _subjectRepo.GetAllListAsync();

        var coreSubjects =
            reportSubjects
                .Where(r =>
                {
                    var subjectInfo =
                        allSubjects.FirstOrDefault(s =>
                            s.Id == r.SubjectId);

                    return subjectInfo != null &&
                           subjectInfo.IsCore;
                })
                .ToList();

        var electiveSubjects =
            reportSubjects
                .Where(r =>
                {
                    var subjectInfo =
                        allSubjects.FirstOrDefault(s =>
                            s.Id == r.SubjectId);

                    return subjectInfo != null &&
                           subjectInfo.IsBestSubject &&
                           !subjectInfo.IsCore;
                })
                .ToList();

        var bestTwo =
            electiveSubjects
                .OrderByDescending(r => r.TotalScore)
                .Take(2)
                .ToList();

        var subjectsUsed =
            coreSubjects.Concat(bestTwo).ToList();

        const int lowestGradeNumber = 9;

        var hasCoreZeroScore =
            coreSubjects.Any(c => c.TotalScore == 0);

        var hasGradeNineInCore =
            coreSubjects.Any(c =>
                Convert.ToInt32(c.GradeNumber) ==
                lowestGradeNumber);

        var hasAnyZeroRawScore =
            subjectsUsed.Any(s => s.TotalScore == 0);

        if (hasCoreZeroScore ||
            hasGradeNineInCore ||
            hasAnyZeroRawScore)
        {
            aggregate = 999;
            rawScore = 0;
        }
        else
        {
            foreach (var sub in subjectsUsed)
            {
                if (sub.TotalScore > 0 &&
                    sub.SubjectRemark != "N/A")
                {
                    aggregate +=
                        Convert.ToInt32(sub.GradeNumber);

                    rawScore += sub.TotalScore;
                }
            }
        }
    }

    /* ===========================
       CLASS PROMOTION
    =========================== */

    var classPromotion =
        await _classPromotionRepo
            .FirstOrDefaultAsync(cp =>
                cp.FromClassId == classId);

    var termBeginDate =
        classPromotion?.StartDate ??
        DateTime.MinValue;

    string promotedClassName = string.Empty;

    if (classPromotion != null)
    {
        var toClassInfo =
            await _levelClassRepo
                .FirstOrDefaultAsync(
                    classPromotion.ToClassId);

        if (toClassInfo != null)
        {
            promotedClassName =
                $"{await GetClassName(toClassInfo.ClassId)} " +
                $"{await GetStreamName(toClassInfo.StreamId)}";
        }
    }
    
    /* ===========================
    PREVIOUS TERMS AVERAGE
    =========================== */

    var previousTermsAverage = await GetPreviousTermsAverage(
        studentId,
        classId,
        academicYearId,
        termId);

    /* ===========================
       FINAL DTO
    =========================== */

    return new TerminalReportDto
    {
        CompanyLogo =
            schoolProfile.CompanyLogo != null
                ? $"data:image/png;base64,{Convert.ToBase64String(schoolProfile.CompanyLogo)}"
                : null,

        SignatureImage = displaySignature && schoolProfile.Signature != null
                ? $"data:image/png;base64,{Convert.ToBase64String(schoolProfile.Signature)}"
                : null,
        SchoolName = schoolProfile.SchoolName,
        Address = schoolProfile.Address,
        Email = schoolProfile.Email,
        PhoneNo = schoolProfile.PhoneNo,
        StudentName = await GetStudentFullNameAsync(studentId),
        StudentIdentifier = student.StudentIdentifier,
        HouseName = student.HouseName,
        Year = period,
        Term = termName,
        ClassName = className,
        TermEndDate = termEndDate.ToString("dd-MMM-yyyy"),
        TermBeginDate = termBeginDate.ToString("dd-MMM-yyyy"),
        TeacherName = teacherFullName,
        Attendance = await GetAttendance(studentId, academicYearId, classId, termId),
        SchoolDays = schoolProfile?.SchoolDays ?? 0,
        TotalStudents = studentsInClass.Count,
        ClassPercentage = classPercentage,
        ExamPercentage = examPercentage,
        TotalMarksExpected = totalMarks,
        OverallTotalScore = reportSubjects.Sum(s => s.TotalScore),
        HighestClassMarks = highestClassMarks,
        LowestClassMarks = lowestClassMarks,
        Aggregate = aggregate,
        RawScore = rawScore,
        ClassPosition = classPosition,
        OverallClassPosition = overallPosition,
        Stage = stage,
        Attitude = await GetBehaviouralRemark("Attitude", studentId, academicYearId, classId),
        Conduct =
            await GetBehaviouralRemark(
                "Conduct",
                studentId,
                academicYearId,
                classId),

        ClassTeacherRemarks =
            await GetClassTeacherRemark(
                studentId,
                classId,
                academicYearId),

        HeadTeacherRemarks =
            await GetHeadTeacherRemark(
                studentId,
                classId,
                academicYearId),
        PromotedClassName = promotedClassName,
        TerminalReport = reportSubjects,
        StageRemarks = await GetStageSubjectRemarks(stage),
        IsClassSplitting = isClassSplitting,
        IsSubjectSplitting = isSubjectSplitting,
        DisplaySignature = displaySignature,
        CurrentTermsAverage = currentTermAverage,
        PreviousTermsAverage = previousTermsAverage,
    };
}
    public async Task<byte[]> RenderTerminalReportPdf(TerminalReportDto dto)
{
    try
    {
        var reportDto = dto;
        var subjectResults = reportDto.TerminalReport ?? new List<TerminalReportSubjectDto>();
        var stageGradeRemarks = reportDto.StageRemarks ?? new List<StageRemarkDto>();

        /* =========================================================
           0️⃣ SELECT TEMPLATE BASED ON STAGE
        ==========================================================*/

        var templateFileName = string.Equals(reportDto.Stage, "JHS", StringComparison.OrdinalIgnoreCase)
            ? "TerminalReport.html"
            : "TerminalReportBasic.html";

        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", templateFileName);
        var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

        /* =========================================================
           1️⃣ GENERATE SUBJECT TABLE ROWS
        ==========================================================*/

        var subjectRowsBuilder = new StringBuilder();

        int index = 1;
        foreach (var subject in subjectResults)
        {
            subjectRowsBuilder.Append($@"
          <tr>
              <td>{index}</td>
              <td>{subject.SubjectName}</td>
              <td>{subject.PercentageClassScore:N2}</td>
              <td>{subject.PercentageExam:N2}</td>
              <td><strong>{subject.TotalScore:N2}</strong></td>
              <td>{subject.PositionPerSubject}</td> 
              <td>{subject.GradeNumber}</td>
              <td>{subject.SubjectRemark}</td>
          </tr>");
            index++;
        }

        /* =========================================================
           2️⃣ GENERATE STAGE GRADE REMARK LIST
        ==========================================================*/

        var stageRemarksBuilder = new StringBuilder();

        foreach (var stage in stageGradeRemarks)
        {
            var formatted = $"{stage.MinMark:N0} - {stage.MaxMark:N0} : {stage.GradeNumber} - {stage.Remark}";

            stageRemarksBuilder.Append($@"
            <li>{formatted}</li>");
        }

        /* =========================================================
           3️⃣ REPLACE PLACEHOLDERS
        ==========================================================*/

        var finalHtml = htmlTemplate
            .Replace("{{CompanyLogo}}", reportDto.CompanyLogo ?? "")
            .Replace("{{SchoolName}}", reportDto.SchoolName ?? "")
            .Replace("{{Address}}", reportDto.Address ?? "")
            .Replace("{{PhoneNo}}", reportDto.PhoneNo ?? "")
            .Replace("{{Email}}", reportDto.Email ?? "")
            .Replace("{{SignatureImage}}", reportDto.SignatureImage ?? "")
            .Replace("{{Year}}", reportDto.Year ?? "")
            .Replace("{{Term}}", reportDto.Term ?? "")
            .Replace("{{StudentName}}", reportDto.StudentName ?? "")
            .Replace("{{StudentIdentifier}}", reportDto.StudentIdentifier ?? "")
            .Replace("{{ClassName}}", reportDto.ClassName ?? "")
            .Replace("{{TermEndDate}}", reportDto.TermEndDate ?? "")
            .Replace("{{ClassPosition}}", reportDto.ClassPosition.ToString())
            .Replace("{{TeacherName}}", reportDto.TeacherName ?? "")
            .Replace("{{TermBeginDate}}", reportDto.TermBeginDate ?? "")
            .Replace("{{Attendance}}", reportDto.Attendance.ToString())
            .Replace("{{SchoolDays}}", reportDto.SchoolDays.ToString())
            .Replace("{{TotalStudents}}", reportDto.TotalStudents.ToString())
            .Replace("{{ClassPercentage}}", reportDto.ClassPercentage.ToString("N0"))
            .Replace("{{ExamPercentage}}", reportDto.ExamPercentage.ToString("N0"))
            .Replace("{{OverallTotalScore}}", reportDto.OverallTotalScore.ToString("N2"))
            .Replace("{{TotalMarksExpected}}", reportDto.TotalMarksExpected.ToString())
            .Replace("{{HighestClassMarks}}", reportDto.HighestClassMarks.ToString("N2"))
            .Replace("{{LowestClassMarks}}", reportDto.LowestClassMarks.ToString("N2"))
            .Replace("{{Attitude}}", reportDto.Attitude ?? "")
            .Replace("{{Conduct}}", reportDto.Conduct ?? "")
            .Replace("{{ClassTeacherRemarks}}", reportDto.ClassTeacherRemarks ?? "")
            .Replace("{{HeadTeacherRemarks}}", reportDto.HeadTeacherRemarks ?? "")
            .Replace("{{PromotedClassName}}", reportDto.PromotedClassName ?? "")
            .Replace("{{Aggregate}}", reportDto.Aggregate.ToString())
            .Replace("{{RawScore}}", reportDto.RawScore.ToString("N2"))
            .Replace("{{CurrentTermsAverage}}", reportDto.CurrentTermsAverage.ToString("N2"))
            .Replace("{{PreviousTermsAverage}}", reportDto.PreviousTermsAverage.ToString("N2"))
            .Replace("{{currentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"))
            .Replace("{{pageNumber}}", "1")
            .Replace("{{pageBreakCount}}", "1")
            .Replace("{{SubjectRows}}", subjectRowsBuilder.ToString())
            .Replace("{{StageGradeRemarks}}", stageRemarksBuilder.ToString());

        /* =========================================================
           4️⃣ CONVERT TO PDF
        ==========================================================*/

        var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");

        var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);

        var blinkConverterSettings = new BlinkConverterSettings
        {
            BlinkPath = blinkEnginePath,
            Orientation = PdfPageOrientation.Portrait,
            EnableJavaScript = true,
            AdditionalDelay = 2000
        };

        htmlConverter.ConverterSettings = blinkConverterSettings;

        using (var document = htmlConverter.Convert(finalHtml, string.Empty))
        using (var stream = new MemoryStream())
        {
            document.Save(stream);
            document.Close(true);

            using (var finalDoc = new PdfDocument())
            {
                finalDoc.PageSettings.Size = PdfPageSize.A4;

                Stream[] streams = { stream };
                PdfDocumentBase.Merge(finalDoc, streams);

                using (var reportStream = new MemoryStream())
                {
                    finalDoc.Save(reportStream);
                    finalDoc.Close(true);

                    return reportStream.ToArray();
                }
            }
        }
    }
    catch (Exception e)
    {
        Logger.Error($"TerminalReport exception: {e.Message}");
        Logger.Error($"TerminalReport stack: {e.StackTrace}");
        return null;
    }
}
     public async Task<byte[]> RenderTerminalReportWithAnalysisPdf(TerminalReportDto dto)
{
    try
    {
        var reportDto = dto;
        var subjectResults = reportDto.TerminalReport ?? new List<TerminalReportSubjectDto>();
        var stageGradeRemarks = reportDto.StageRemarks ?? new List<StageRemarkDto>();

        /* =========================================================
           0️⃣ SELECT TEMPLATE BASED ON STAGE
        ==========================================================*/

        var templateFileName = string.Equals(reportDto.Stage, "JHS", StringComparison.OrdinalIgnoreCase)
            ? "TerminalReportAnalysis.html"
            : "TerminalReportAnalysisBasic.html";

        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", templateFileName);
        var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

        /* =========================================================
           1️⃣ GENERATE SUBJECT TABLE ROWS
        ==========================================================*/

        var subjectRowsBuilder = new StringBuilder();

        int index = 1;
        foreach (var subject in subjectResults)
        {
            subjectRowsBuilder.Append($@"
          <tr>
              <td>{index}</td>
              <td>{subject.SubjectName}</td>
              <td>{subject.PercentageClassScore:N2}</td>
              <td>{subject.PercentageExam:N2}</td>
              <td><strong>{subject.TotalScore:N2}</strong></td>
              <td>{subject.PositionPerSubject}</td> 
              <td>{subject.GradeNumber}</td>
              <td>{subject.SubjectRemark}</td>
          </tr>");
            index++;
        }

        /* =========================================================
           2️⃣ GENERATE STAGE GRADE REMARK LIST
        ==========================================================*/

        var stageRemarksBuilder = new StringBuilder();

        foreach (var stage in stageGradeRemarks)
        {
            var formatted = $"{stage.MinMark:N0} - {stage.MaxMark:N0} : {stage.GradeNumber} - {stage.Remark}";

            stageRemarksBuilder.Append($@"
            <li>{formatted}</li>");
        }

        /* =========================================================
           3️⃣ REPLACE PLACEHOLDERS
        ==========================================================*/

        var finalHtml = htmlTemplate
            .Replace("{{CompanyLogo}}", reportDto.CompanyLogo ?? "")
            .Replace("{{SchoolName}}", reportDto.SchoolName ?? "")
            .Replace("{{Address}}", reportDto.Address ?? "")
            .Replace("{{PhoneNo}}", reportDto.PhoneNo ?? "")
            .Replace("{{Email}}", reportDto.Email ?? "")
            .Replace("{{SignatureImage}}", reportDto.SignatureImage ?? "")
            .Replace("{{Year}}", reportDto.Year ?? "")
            .Replace("{{Term}}", reportDto.Term ?? "")
            .Replace("{{StudentName}}", reportDto.StudentName ?? "")
            .Replace("{{StudentIdentifier}}", reportDto.StudentIdentifier ?? "")
            .Replace("{{ClassName}}", reportDto.ClassName ?? "")
            .Replace("{{TermEndDate}}", reportDto.TermEndDate ?? "")
            .Replace("{{ClassPosition}}", reportDto.ClassPosition.ToString())
            .Replace("{{TeacherName}}", reportDto.TeacherName ?? "")
            .Replace("{{TermBeginDate}}", reportDto.TermBeginDate ?? "")
            .Replace("{{Attendance}}", reportDto.Attendance.ToString())
            .Replace("{{SchoolDays}}", reportDto.SchoolDays.ToString())
            .Replace("{{TotalStudents}}", reportDto.TotalStudents.ToString())
            .Replace("{{ClassPercentage}}", reportDto.ClassPercentage.ToString("N0"))
            .Replace("{{ExamPercentage}}", reportDto.ExamPercentage.ToString("N0"))
            .Replace("{{OverallTotalScore}}", reportDto.OverallTotalScore.ToString("N2"))
            .Replace("{{TotalMarksExpected}}", reportDto.TotalMarksExpected.ToString())
            .Replace("{{HighestClassMarks}}", reportDto.HighestClassMarks.ToString("N2"))
            .Replace("{{LowestClassMarks}}", reportDto.LowestClassMarks.ToString("N2"))
            .Replace("{{Attitude}}", reportDto.Attitude ?? "")
            .Replace("{{Conduct}}", reportDto.Conduct ?? "")
            .Replace("{{ClassTeacherRemarks}}", reportDto.ClassTeacherRemarks ?? "")
            .Replace("{{HeadTeacherRemarks}}", reportDto.HeadTeacherRemarks ?? "")
            .Replace("{{PromotedClassName}}", reportDto.PromotedClassName ?? "")
            .Replace("{{Aggregate}}", reportDto.Aggregate.ToString())
            .Replace("{{RawScore}}", reportDto.RawScore.ToString("N2"))
            .Replace("{{CurrentTermsAverage}}", reportDto.CurrentTermsAverage.ToString("N2"))
            .Replace("{{PreviousTermsAverage}}", reportDto.PreviousTermsAverage.ToString("N2"))
            .Replace("{{currentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"))
            .Replace("{{pageNumber}}", "1")
            .Replace("{{pageBreakCount}}", "1")
            .Replace("{{SubjectRows}}", subjectRowsBuilder.ToString())
            .Replace("{{StageGradeRemarks}}", stageRemarksBuilder.ToString());

        /* =========================================================
           4️⃣ CONVERT TO PDF
        ==========================================================*/

        var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");

        var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);

        var blinkConverterSettings = new BlinkConverterSettings
        {
            BlinkPath = blinkEnginePath,
            Orientation = PdfPageOrientation.Portrait,
            EnableJavaScript = true,
            AdditionalDelay = 2000
        };

        htmlConverter.ConverterSettings = blinkConverterSettings;

        using (var document = htmlConverter.Convert(finalHtml, string.Empty))
        using (var stream = new MemoryStream())
        {
            document.Save(stream);
            document.Close(true);

            using (var finalDoc = new PdfDocument())
            {
                finalDoc.PageSettings.Size = PdfPageSize.A4;

                Stream[] streams = { stream };
                PdfDocumentBase.Merge(finalDoc, streams);

                using (var reportStream = new MemoryStream())
                {
                    finalDoc.Save(reportStream);
                    finalDoc.Close(true);

                    return reportStream.ToArray();
                }
            }
        }
    }
    catch (Exception e)
    {
        Logger.Error($"TerminalReport exception: {e.Message}");
        Logger.Error($"TerminalReport stack: {e.StackTrace}");
        return null;
    }
}
    public async Task<byte[]> RenderTerminalReportPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        var dto = await BuildTerminalReportAsync(studentId, classId, academicYearId, termId);
        return await RenderTerminalReportPdf(dto);}
    public async Task<byte[]> RenderTerminalReportWithAnalysisPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        var dto = await BuildTerminalReportAsync(studentId, classId, academicYearId, termId);
        return await RenderTerminalReportWithAnalysisPdf(dto);}
    private async Task<IEnumerable<MidTermAssessmentsDto>> GetMidTermAssessments(Guid classId, Guid academicYearId, Guid termId, Guid studentId)
    {
        var assessments = await _midTermAssessmentRepo.GetAllListAsync(a =>
            a.ClassId == classId &&
            a.AcademicYearId == academicYearId &&
            a.TermId == termId);

        if (!assessments.Any())
            return new List<MidTermAssessmentsDto>();

        // 🔥 Load all headers from DB at once
        var allHeaders = await _assessmentRemarkHeaderRepo.GetAllListAsync();

        var result = new List<MidTermAssessmentsDto>();

        foreach (var assessmentEntry in assessments)
        {
            var studentAssessment = assessmentEntry.Assessment
                .FirstOrDefault(x => x.StudentId == studentId);

            if (studentAssessment == null)
                continue;

            foreach (var savedHeader in studentAssessment.Headers)
            {
                // 🔎 Find original header definition from DB
                var originalHeader = allHeaders
                    .FirstOrDefault(h => h.Id == savedHeader.Id);

                if (originalHeader == null)
                    continue;

                var selectedOptionTexts = new List<string>();

                // savedHeader.Options contains only selected Option Ids
                foreach (var savedOption in savedHeader.Options)
                {
                    var originalOption = originalHeader.Options
                        ?.FirstOrDefault(o => o.Id == savedOption.Id);

                    if (originalOption != null)
                        selectedOptionTexts.Add(originalOption.Option);
                }

                result.Add(new MidTermAssessmentsDto
                {
                    AssessmentHeader = originalHeader.Name,
                    AssessmentRemark = string.Join(", ", selectedOptionTexts)
                });
            }
        }

        return result;
    }
    public async Task<MidTermResultsDto> BuildMidTermResults(Guid studentId, Guid classId, Guid academicYearId, Guid termId) {
        var student = await _studentRepo.GetAsync(studentId);
        var schoolProfile = await _profileRepo.FirstOrDefaultAsync(x => true);
        var classInfo = await _levelClassRepo.GetAsync(classId);
        var level = classInfo.LevelId;
        var levelInfo = await _levelRepo.GetAsync(level);
        var actualLevelId = levelInfo.ActualLevelId;
        var levelName = await GetLevelName(actualLevelId);
        var stage = !string.IsNullOrWhiteSpace(levelName) &&
                    (levelName.Contains("JHS", StringComparison.OrdinalIgnoreCase) ||
                     levelName.Contains("Junior High", StringComparison.OrdinalIgnoreCase))
            ? "JHS"
            : "Primary";
        var academicYearName = await GetAcademicYearName(academicYearId);
        var termName = await GetTermName(termId);
        var streamName = await GetStreamName(classInfo.StreamId);
        var mainClassName = await GetClassName(classInfo.ClassId);
        var className = $"{mainClassName} {streamName}";
        var teacherFullName = await GetTeacherByClass(academicYearId, classId);
        var classSubjects = await _assignedSubjectRepo.GetAllListAsync(s => s.ClassId == classId && s.AcademicYearId == academicYearId && s.TermId == termId);
        var yearTerm =
            await _academicYearTermRepo.FirstOrDefaultAsync(t =>
                t.AcademicYearId == academicYearId && t.TermId == termId);

        var assignments = await _assignmentRepo.GetAllListAsync(a =>
            a.ClassId == classId &&
            a.AcademicYearId == academicYearId &&
            a.TermId == termId);

        if (!assignments.Any())
            return new MidTermResultsDto();

        // Students in this class/stream
        var studentsInClass = (await _studentRepo.GetAllListAsync(s => s.ClassId == classId)).ToList();

        // ===========================
        // Build student subject report
        // ===========================
     var reportSubjects = new List<MidTermResult>();

var subjectIds = classSubjects
    .SelectMany(cs => cs.Details)
    .Select(d => d.SubjectId)
    .Distinct()
    .ToList();

foreach (var subjectId in subjectIds)
{
    var subjectAssignments = assignments
        .Where(a => a.SubjectId == subjectId)
        .ToList();

    decimal studentMarksObt = 0;
    decimal studentTotalPossible = 0;

    foreach (var assessment in subjectAssignments)
    {
        var detail = assessment.Details
            .FirstOrDefault(d => d.StudentIdentifier == student.StudentIdentifier);

        if (detail == null) continue;

        if (assessment.Type == "MidTerm")
        {
            studentMarksObt += detail.Marks;
            studentTotalPossible += assessment.OverallMark;
        }
    }

    var studentScore = studentTotalPossible > 0
        ? (studentMarksObt / studentTotalPossible) * 100
        : 0;

    // ===== Class Average =====
    decimal classTotalMarks = 0;
    decimal classTotalPossible = 0;

    foreach (var stu in studentsInClass)
    {
        decimal stuMarks = 0;
        decimal stuPossible = 0;

        foreach (var assessment in subjectAssignments)
        {
            var detail = assessment.Details
                .FirstOrDefault(d => d.StudentIdentifier == stu.StudentIdentifier);

            if (detail == null) continue;

            if (assessment.Type == "MidTerm")
            {
                stuMarks += detail.Marks;
                stuPossible += assessment.OverallMark;
            }
        }

        classTotalMarks += stuMarks;
        classTotalPossible += stuPossible;
    }

    var classAverage = classTotalPossible > 0
        ? (classTotalMarks / classTotalPossible) * 100 / studentsInClass.Count
        : 0;

    var remark = await GetSubjectRemark(studentScore, stage);

    reportSubjects.Add(new MidTermResult
    {
        SubjectId = subjectId,
        SubjectName = await GetSubjectName(subjectId),
        ScoredMark = studentScore,
        Average = classAverage,
        SubjectRemark = remark?.Remark,
    });
}


        reportSubjects = reportSubjects.OrderBy(x => x.SubjectName).ToList();
        var midTermAssessments = await GetMidTermAssessments(classId, academicYearId, termId, studentId);

        // ===========================
        // Build final DTO
        // ===========================
        return new MidTermResultsDto
        {
            CompanyLogo = schoolProfile.CompanyLogo != null
                ? $"data:image/png;base64,{Convert.ToBase64String(schoolProfile.CompanyLogo)}"
                : null,
            SchoolName = schoolProfile.SchoolName,
            Address = schoolProfile.Address,
            Email = schoolProfile.Email,
            PhoneNo = schoolProfile.PhoneNo,
            StudentName = await GetStudentFullNameAsync(studentId),
            StudentIdentifier = student.StudentIdentifier,
            Year = academicYearName,
            Term = termName,
            ClassName = className,
            TeacherName = teacherFullName,
            TotalStudents = studentsInClass.Count,
            ClassTeacherRemarks = await GetClassTeacherRemark(studentId, classId, academicYearId),
            HeadTeacherRemarks = await GetHeadTeacherRemark(studentId, classId, academicYearId),
            MidTermResults = reportSubjects,
            MidTermAssessments = midTermAssessments
        };

    }
    public async Task<byte[]> RenderMidTermPdf(MidTermResultsDto dto) {
    try
    {
        var reportDto = dto;
        var subjectResults = reportDto.MidTermResults ?? new List<MidTermResult>();
        var assessments = reportDto.MidTermAssessments ?? new List<MidTermAssessmentsDto>();

        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "MidTermResult.html");
        var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

        /* =========================================================
           1️⃣ GENERATE SUBJECT TABLE ROWS
        ==========================================================*/

        var subjectRowsBuilder = new StringBuilder();

        foreach (var subject in subjectResults)
        {
            subjectRowsBuilder.Append($@"
                <tr>
                    <td>{subject.SubjectName}</td>
                    <td>{subject.ScoredMark:N2}</td>
                    <td>{subject.Average:N2}</td>
                    <td>{subject.SubjectRemark}</td>
                </tr>");
        }

        /* =========================================================
           2️⃣ GENERATE STAGE GRADE REMARK LIST
        ==========================================================*/

        /*var assessmentRemarksBuilder = new StringBuilder();
        foreach (var a in assessments)
        {
            assessmentRemarksBuilder.Append($@"
                <tr><td>{a.AssessmentHeader}</td><td>{a.AssessmentRemark}</td></tr>");
        }*/
        var midTermAssessmentRows = string.Join("\n", reportDto.MidTermAssessments.Select(a =>
            $"<tr><td>{a.AssessmentHeader}</td><td>{a.AssessmentRemark}</td></tr>"));

        
        /* =========================================================
           3️⃣ REPLACE PLACEHOLDERS
        ==========================================================*/

        var finalHtml = htmlTemplate
            .Replace("{{CompanyLogo}}", reportDto.CompanyLogo ?? "")
            .Replace("{{SchoolName}}", reportDto.SchoolName ?? "")
            .Replace("{{Address}}", reportDto.Address ?? "")
            .Replace("{{PhoneNo}}", reportDto.PhoneNo ?? "")
            .Replace("{{Email}}", reportDto.Email ?? "")
            .Replace("{{Year}}", reportDto.Year ?? "")
            .Replace("{{Term}}", reportDto.Term ?? "")
            .Replace("{{StudentName}}", reportDto.StudentName ?? "")
            .Replace("{{StudentIdentifier}}", reportDto.StudentIdentifier ?? "")
            .Replace("{{ClassName}}", reportDto.ClassName ?? "")
            .Replace("{{TeacherName}}", reportDto.TeacherName ?? "")
            .Replace("{{TotalStudents}}", reportDto.TotalStudents.ToString())
            .Replace("{{ClassTeacherRemarks}}", reportDto.ClassTeacherRemarks ?? "")
            .Replace("{{HeadTeacherRemarks}}", reportDto.HeadTeacherRemarks ?? "")
            .Replace("{{currentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"))
            .Replace("{{pageNumber}}", "1")
            .Replace("{{pageBreakCount}}", "1")
            .Replace("{{SubjectRows}}", subjectRowsBuilder.ToString())
            .Replace("{{MidTermAssessmentRows}}", midTermAssessmentRows.ToString());

        /* =========================================================
           4️⃣ CONVERT TO PDF
        ==========================================================*/

        var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");

        var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);

        var blinkConverterSettings = new BlinkConverterSettings
        {
            BlinkPath = blinkEnginePath,
            Orientation = PdfPageOrientation.Portrait,
            EnableJavaScript = true,
            AdditionalDelay = 2000
        };

        htmlConverter.ConverterSettings = blinkConverterSettings;

        using (var document = htmlConverter.Convert(finalHtml, string.Empty))
        using (var stream = new MemoryStream())
        {
            document.Save(stream);
            document.Close(true);

            using (var finalDoc = new PdfDocument())
            {
                finalDoc.PageSettings.Size = PdfPageSize.A4;

                Stream[] streams = { stream };
                PdfDocumentBase.Merge(finalDoc, streams);

                using (var reportStream = new MemoryStream())
                {
                    finalDoc.Save(reportStream);
                    finalDoc.Close(true);

                    return reportStream.ToArray();
                }
            }
        }
    }
    catch (Exception e)
    {
        Logger.Error($"MidTermReport exception: {e.Message}");
        Logger.Error($"MidTermReport stack: {e.StackTrace}");
        return null;
    }
}
    public async Task<byte[]> RenderMidTermPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId) {
    var dto = await BuildMidTermResults(studentId, classId, academicYearId, termId);
    return await RenderMidTermPdf(dto);}

    public async Task<string> GetStudentEmail(Guid studentId)
    {
        // Get the legal guardian contact for the student
        var legalGuardian = await _studentContactRelationshipRepo
            .FirstOrDefaultAsync(c => c.StudentId == studentId && c.IsLegalGuardian);

        // Return email if exists, otherwise null
        return legalGuardian?.Email;
    }

    private async Task<string> GetStudentName(Guid studentId)
    {
        var student = await _studentRepo.GetAsync(studentId);
        return $"{student.FirstName} {student.LastName}";
    }
    public async Task<object> DispatchTerminalReport(EmailTerminalReportDto dto)
{
    // 1️⃣ Fetch SMTP credentials and school info
    var schoolProfile = await _profileRepo.GetAll().FirstOrDefaultAsync();
    if (schoolProfile == null)
        return new { code = 500, message = "School profile not found." };

    var smtpCredentials = new SmtpCredentials
    {
        PrimaryEmailAddress = schoolProfile.PrimaryEmailAddress,
        EmailPassword = schoolProfile.EmailPassword,
        MailHostName = schoolProfile.MailHostName,
        PortNumber = schoolProfile.PortNumber,
        IsSSLEnabled = schoolProfile.IsSSLEnabled,
        DefaultFromDisplayName = schoolProfile.SchoolName
    };

    if (dto.StudentIds == null || !dto.StudentIds.Any())
        return new { code = 400, message = "No students selected." };

    var dispatchedStudents = new List<string>();
    var skippedStudents = new List<string>();

    // 2️⃣ Loop through all selected students
    foreach (var studentId in dto.StudentIds)
    {
        try
        {
            // Fetch academic year and term for this iteration
            var academicYear = await _academicYearRepo.FirstOrDefaultAsync(a => a.Id == dto.AcademicYearId);
            var termsPath = Path.Combine(
                _webHostEnvironment.WebRootPath,
                "jsonDataSample",
                "terms.json"
            );


            var termsJson = await File.ReadAllTextAsync(termsPath);

            var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                        ?? new List<TermDto>();


            var term = terms.FirstOrDefault(x => x.Id == dto.TermId);
            var name = await GetStudentName(studentId);
            if (academicYear == null)
            {
                skippedStudents.Add($"Student:{name} (academic year not found)");
                continue;
            }

            if (term == null)
            {
                skippedStudents.Add($"Student:{name} (term not found)");
                continue;
            }

            // Build the terminal report
            var reportDto = await BuildTerminalReportAsync(studentId, dto.ClassId, dto.AcademicYearId, dto.TermId);
            if (reportDto == null)
            {
                skippedStudents.Add($"Student:{name} (report not generated)");
                continue;
            }

            var pdfBytes = await RenderTerminalReportPdf(reportDto);
            if (pdfBytes == null || pdfBytes.Length == 0)
            {
                skippedStudents.Add($"Student:{name} (PDF not generated)");
                continue;
            }

            // Fetch legal guardians
            var guardians = await _studentContactRelationshipRepo
                .GetAllListAsync(c => c.StudentId == studentId && c.IsLegalGuardian);

            if (guardians == null || !guardians.Any())
            {
                skippedStudents.Add($"Student:{name} (no legal guardians found)");
                continue;
            }
            // Loop through all guardians for this student
            foreach (var guardian in guardians)
            {
                if (string.IsNullOrWhiteSpace(guardian.Email))
                {
                    skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (no email)");
                    continue;
                }

                // Clean email
                var emailAddress = guardian.Email.Trim().Replace("\r", "").Replace("\n", "");

                // Validate email format
                try
                {
                    var mailAddress = new System.Net.Mail.MailAddress(emailAddress);
                    emailAddress = mailAddress.Address;
                }
                catch
                {
                    skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (invalid email: {emailAddress})");
                    continue;
                }
                
                var studentInfo = await _studentRepo.GetAsync(studentId);
                var  studentName = studentInfo.FirstName + " " + studentInfo.LastName;

                var email = new EmailMessage
                {
                    To = new List<string> { emailAddress },
                    Subject = $"Terminal Report - {schoolProfile.SchoolName}",
                    Body = $"Dear Guardian of {studentName},<br/><br/>" +
                           $"Please find attached the terminal report for {term.Name} - {academicYear.Name}.<br/><br/>" +
                           $"Regards,<br/>{schoolProfile.SchoolName}"
                };

                var fileName = $"TerminalReport_{studentName}_{term.Name}_{academicYear.Name}.pdf";
                email.Attachments.Add((pdfBytes, fileName, "application/pdf"));

                try
                {
                    await SendWithCompanyCredentials(email, smtpCredentials);
                    dispatchedStudents.Add($"{studentName} ({emailAddress})");
                }
                catch (Exception ex)
                {
                    skippedStudents.Add($"{studentName} ({emailAddress}) (exception: {ex.Message})");
                }
            }

        }
        catch (Exception ex)
        {
            var name = await GetStudentName(studentId);
            skippedStudents.Add($"Student:{name} (exception: {ex.Message})");
        }
    }
    return new
    {
        code = 200,
        message = $"Terminal reports dispatched: {dispatchedStudents.Count}. Skipped: {skippedStudents.Count}.",
        dispatched = dispatchedStudents,
        skipped = skippedStudents
    };
}
   
  

    public async Task<object> DispatchMidTermReport(EmailMidTermDto dto)
{
    // 1️⃣ Fetch SMTP credentials and school info
    var schoolProfile = await _profileRepo.GetAll().FirstOrDefaultAsync();
    if (schoolProfile == null)
        return new { code = 500, message = "School profile not found." };

    var smtpCredentials = new SmtpCredentials
    {
        PrimaryEmailAddress = schoolProfile.PrimaryEmailAddress,
        EmailPassword = schoolProfile.EmailPassword,
        MailHostName = schoolProfile.MailHostName,
        PortNumber = schoolProfile.PortNumber,
        IsSSLEnabled = schoolProfile.IsSSLEnabled,
        DefaultFromDisplayName = schoolProfile.SchoolName
    };

    if (dto.StudentIds == null || !dto.StudentIds.Any())
        return new { code = 400, message = "No students selected." };

    var dispatchedStudents = new List<string>();
    var skippedStudents = new List<string>();

    // 2️⃣ Loop through all selected students
    foreach (var studentId in dto.StudentIds)
    {
        try
        {
            // Fetch academic year and term for this iteration
            var academicYear = await _academicYearRepo.FirstOrDefaultAsync(a => a.Id == dto.AcademicYearId);
            var termsPath = Path.Combine(
                _webHostEnvironment.WebRootPath,
                "jsonDataSample",
                "terms.json"
            );


            var termsJson = await File.ReadAllTextAsync(termsPath);

            var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                        ?? new List<TermDto>();


            var term = terms.FirstOrDefault(x => x.Id == dto.TermId);
            var name = await GetStudentName(studentId);

            if (academicYear == null)
            {
                skippedStudents.Add($"Student:{name} (academic year not found)");
                continue;
            }

            if (term == null)
            {
                skippedStudents.Add($"Student:{name} (term not found)");
                continue;
            }

            // Build the terminal report
            var reportDto = await BuildMidTermResults(studentId, dto.ClassId, dto.AcademicYearId, dto.TermId);
            if (reportDto == null)
            {
                skippedStudents.Add($"Student:{name} (report not generated)");
                continue;
            }

            var pdfBytes = await RenderMidTermPdf(reportDto);
            if (pdfBytes == null || pdfBytes.Length == 0)
            {
                skippedStudents.Add($"Student:{name} (PDF not generated)");
                continue;
            }

            // Fetch legal guardians
            var guardians = await _studentContactRelationshipRepo
                .GetAllListAsync(c => c.StudentId == studentId && c.IsLegalGuardian);

            if (guardians == null || !guardians.Any())
            {
                skippedStudents.Add($"Student:{name} (no legal guardians found)");
                continue;
            }
            // Loop through all guardians for this student
            foreach (var guardian in guardians)
            {
                if (string.IsNullOrWhiteSpace(guardian.Email))
                {
                    skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (no email)");
                    continue;
                }

                // Clean email
                var emailAddress = guardian.Email.Trim().Replace("\r", "").Replace("\n", "");

                // Validate email format
                try
                {
                    var mailAddress = new System.Net.Mail.MailAddress(emailAddress);
                    emailAddress = mailAddress.Address;
                }
                catch
                {
                    skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (invalid email: {emailAddress})");
                    continue;
                }
                
                var studentInfo = await _studentRepo.GetAsync(studentId);
                var  studentName = studentInfo.FirstName + " " + studentInfo.LastName;

                var email = new EmailMessage
                {
                    To = new List<string> { emailAddress },
                    Subject = $"MidTerm Report - {schoolProfile.SchoolName}",
                    Body = $"Dear Guardian of {studentName},<br/><br/>" +
                           $"Please find attached the terminal report for {term.Name} - {academicYear.Name}.<br/><br/>" +
                           $"Regards,<br/>{schoolProfile.SchoolName}"
                };

                var fileName = $"MidTerm Report_{studentName}_{term.Name}_{academicYear.Name}.pdf";
                email.Attachments.Add((pdfBytes, fileName, "application/pdf"));

                try
                {
                    await SendWithCompanyCredentials(email, smtpCredentials);
                    dispatchedStudents.Add($"{studentName} ({emailAddress})");
                }
                catch (Exception ex)
                {
                    skippedStudents.Add($"{studentName} ({emailAddress}) (exception: {ex.Message})");
                }
            }

        }
        catch (Exception ex)
        {
            var name = await GetStudentName(studentId);
            skippedStudents.Add($"Student:{name} (exception: {ex.Message})");
        }
    }
    return new
    {
        code = 200,
        message = $"Terminal reports dispatched: {dispatchedStudents.Count}. Skipped: {skippedStudents.Count}.",
        dispatched = dispatchedStudents,
        skipped = skippedStudents
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
    public async Task<List<BillDto>> StudentBill(Guid studentId, Guid academicYearId, Guid termId)
{
    // ==========================
    // STUDENT
    // ==========================

    var student = await _studentRepo.FirstOrDefaultAsync(studentId);

    if (student == null)
        return new List<BillDto>();


    var studentName = string.Join(" ", new[]
    {
        student.FirstName,
        student.OtherName,
        student.LastName
    }.Where(x => !string.IsNullOrWhiteSpace(x)));



    // ==========================
    // CLASS
    // ==========================

    var classInfo = await _levelClassRepo.FirstOrDefaultAsync(student.ClassId);

    var className = "";

    if (classInfo != null)
    {
        var streamName = await GetStreamName(classInfo.StreamId);
        var mainClassName = await GetClassName(classInfo.ClassId);

        className = $"{mainClassName} {streamName}".Trim();
    }



    // ==========================
    // BILLS
    // ==========================

    var bills = await _billRepository.GetAllListAsync(x =>
        !x.IsCancelled &&
        x.AcademicYearId == academicYearId &&
        x.TermId == termId);


    if (!bills.Any())
        return new List<BillDto>();



    // Get only bills belonging to this student
    var studentBills = bills
        .Where(b => b.Students.Any(s =>
            s.StudentId == studentId &&
            s.ToBeBilled))
        .ToList();



    if (!studentBills.Any())
        return new List<BillDto>();



    // ==========================
    // ACADEMIC PERIOD
    // ==========================

    var academicYear = await _academicYearRepo.FirstOrDefaultAsync(academicYearId);


    var termsPath = Path.Combine(
        _webHostEnvironment.WebRootPath,
        "jsonDataSample",
        "terms.json"
    );


    var termsJson = await File.ReadAllTextAsync(termsPath);

    var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                ?? new List<TermDto>();


    var term = terms.FirstOrDefault(x => x.Id == termId);


    var period = $"{academicYear?.Name} - {term?.Name}";



    // ==========================
    // CURRENCY
    // ==========================

    var schoolProfile = await _profileRepo.FirstOrDefaultAsync(x => true);

    var currency = schoolProfile != null
        ? await _currencyRepository.FirstOrDefaultAsync(schoolProfile.CurrencyId)
        : null;


    var currencyName = currency?.CurrencyName ?? "";



    // ==========================
    // FEE ITEMS
    // ==========================

    var feeItems = await _standardFeeItemRepository.GetAllListAsync();
    var boardingItems = await _boardingItemRepository.GetAllListAsync();
    var supItems = await _supItemRepository.GetAllListAsync();


    var standardDict = feeItems.ToDictionary(x => x.Id);
    var boardingDict = boardingItems.ToDictionary(x => x.Id);
    var supDict = supItems.ToDictionary(x => x.Id);

    decimal GetStudentBillAmount(Bill bill)
    {
        var billedStudent = bill.Students.FirstOrDefault(s =>
            s.StudentId == studentId &&
            s.ToBeBilled);


        if (billedStudent == null)
            return 0;


        return billedStudent.IsDiscounted
            ? billedStudent.Amount - billedStudent.DiscountAmount
            : billedStudent.Amount;
    }



    var academicUserFeeTotal = studentBills
        .Where(x => x.BillTypeId == 1)
        .Sum(GetStudentBillAmount);



    var supplementaryFeeTotal = studentBills
        .Where(x => x.BillTypeId == 2)
        .Sum(GetStudentBillAmount);



    var boardingFeeTotal = studentBills
        .Where(x => x.BillTypeId == 3)
        .Sum(GetStudentBillAmount);

    var lines = new List<BillDto>();


    // ==========================
    // PROCESS EACH BILL
    // ==========================
    var totalAmount = studentBills.Sum(b =>
    {
        var billedStudent = b.Students.FirstOrDefault(x =>
            x.StudentId == studentId &&
            x.ToBeBilled);

        if (billedStudent == null)
            return 0;

        return billedStudent.Amount;
    });
    foreach (var bill in studentBills)
    {
        var billedStudent = bill.Students.First(x =>
            x.StudentId == studentId &&
            x.ToBeBilled);


        var previousBalance = student.BalanceDue - totalAmount;

        if (previousBalance < 0)
            previousBalance = 0;



        foreach (var detail in bill.Details)
        {
            var description = GetFeeItemDescription(
                bill.BillTypeId,
                detail.FeeItemId,
                standardDict,
                boardingDict,
                supDict
            );


            lines.Add(new BillDto
            {
                StudentId = student.Id,

                RegNo = student.StudentIdentifier,
                StudentName = studentName,
                ClassName = className,

                BillNo = bill.BillNumber,
                Period = period,

                PreviousBalance = previousBalance,

                Description = description,
                Amount = detail.Amount,

                TotalAmount = totalAmount,
                AmountToPay = student.BalanceDue,

                Currency = currencyName,
                AcademicUserFeeTotal = academicUserFeeTotal,
                SupplementaryFeeTotal = supplementaryFeeTotal,
                BoardingFeeTotal = boardingFeeTotal,
            });
        }
    }


    return lines;
}
    public async Task<List<BillFooterDto>> GetBillFooters(Guid studentId, Guid academicYearId, Guid termId)
{
    var student = await _studentRepo.FirstOrDefaultAsync(studentId);

    if (student == null)
        return new List<BillFooterDto>();

    var footers = await _billFooterRepository.GetAllListAsync(x =>
        x.AcademicYearId == academicYearId &&
        x.TermId == termId);

    return footers
        .Where(f =>
            f.ToSchool ||
            (f.ToClass && f.Details != null && 
             f.Details.Any(d => d.ClassId == student.ClassId)) ||
            (f.Details != null && 
             f.Details.Any(d => d.StudentId == student.Id)))
        .OrderBy(f => f.OrderNumber)
        .Select(f => new BillFooterDto
        {
            FooterId = f.Id,
            Message = f.Message,
            OrderNumber = f.OrderNumber,
            ToSchool = f.ToSchool,
            ToClass = f.ToClass
        })
        .ToList();
}
    public async Task<BillDto> BuildStudentBill(Guid studentId, Guid academicYearId, Guid termId)
{
    var studentBillLines = await StudentBill(studentId, academicYearId, termId);

    var schoolProfile = await _profileRepo.FirstOrDefaultAsync(x => true);
 
    if (!studentBillLines.Any())
        return null;

    var studentBill = studentBillLines.First();
    var footers = await GetBillFooters(studentId, academicYearId, termId);
    return new BillDto
    {
        CompanyLogo = schoolProfile.CompanyLogo != null
            ? $"data:image/png;base64,{Convert.ToBase64String(schoolProfile.CompanyLogo)}"
            : null,

        SchoolName = schoolProfile.SchoolName,
        Address = schoolProfile.Address,
        Email = schoolProfile.Email,
        PhoneNo = schoolProfile.PhoneNo,
        Currency = studentBill.Currency,
        StudentId = studentBill.StudentId,
        RegNo = studentBill.RegNo,
        StudentName = studentBill.StudentName,
        ClassName = studentBill.ClassName,
        BillNo = studentBill.BillNo,
        Period = studentBill.Period,
        PreviousBalance = studentBill.PreviousBalance,
        TotalAmount = studentBill.TotalAmount,
        AmountToPay = studentBill.AmountToPay,
        AcademicUserFeeTotal = studentBill.AcademicUserFeeTotal,
        SupplementaryFeeTotal = studentBill.SupplementaryFeeTotal,
        BoardingFeeTotal = studentBill.BoardingFeeTotal,
        Lines = studentBillLines.Select(line => new BillLineDto
        {
            Description = line.Description,
            Amount = line.Amount
        }).ToList(),
        Footers = footers
    };
}
    public async Task<byte[]> RenderStudentBillPdf(Guid studentId, Guid academicYearId, Guid termId) {
        var dto = await BuildStudentBill(studentId, academicYearId, termId);
        return await RenderStudentBillPdf(dto);}
    public async Task<byte[]> RenderStudentBillSummaryPdf(Guid studentId, Guid academicYearId, Guid termId) {
        var dto = await BuildStudentBill(studentId, academicYearId, termId);
        return await RenderStudentBillSummaryPdf(dto);}
    public async Task<byte[]> RenderStudentBillPdf(BillDto dto)
    {
    try
    {
        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "StudentBill.html");
        var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);

       var billRowsBuilder = new StringBuilder();

       var index = 1;
       foreach (var item in dto.Lines)
       {
           billRowsBuilder.Append($@"
               <tr>
                    <td>{index}</td>
                   <td>{item.Description}</td>
                   <td>{item.Amount:N2}</td>
               </tr>");
           index++;
       }
       
       // footers
       var footersBuilder = new StringBuilder();
       
       foreach (var footer in dto.Footers.OrderBy(x => x.OrderNumber))
       {
           footersBuilder.Append($@"
               <li>{footer.Message}</li>");
       }
       
       var finalHtml = htmlTemplate
           .Replace("{{CompanyLogo}}", dto.CompanyLogo ?? "")
           .Replace("{{SchoolName}}", dto.SchoolName ?? "")
           .Replace("{{Address}}", dto.Address ?? "")
           .Replace("{{PhoneNo}}", dto.PhoneNo ?? "")
           .Replace("{{Email}}", dto.Email ?? "")
           .Replace("{{StudentName}}", dto.StudentName ?? "")
           .Replace("{{Currency}}", dto.Currency ?? "")
           .Replace("{{RegNo}}", dto.RegNo ?? "")
           .Replace("{{ClassName}}", dto.ClassName ?? "")
           .Replace("{{BillNo}}", dto.BillNo ?? "")
           .Replace("{{Period}}", dto.Period ?? "")
           .Replace("{{PreviousBalance}}", dto.PreviousBalance.ToString("N2"))
           .Replace("{{TotalAmount}}", dto.TotalAmount.ToString("N2"))
           .Replace("{{AmountToPay}}", dto.AmountToPay.ToString("N2"))
           .Replace("{{BillRows}}", billRowsBuilder.ToString())
           .Replace("{{BillFooters}}", footersBuilder.ToString())
           .Replace("{{currentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"))
           .Replace("{{PageNumber}}", "1");

        /* =========================================================
           4️⃣ CONVERT TO PDF
        ==========================================================*/

        var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");

        var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);

        var blinkConverterSettings = new BlinkConverterSettings
        {
            BlinkPath = blinkEnginePath,
            Orientation = PdfPageOrientation.Portrait,
            EnableJavaScript = true,
            AdditionalDelay = 2000
        };

        htmlConverter.ConverterSettings = blinkConverterSettings;

        using (var document = htmlConverter.Convert(finalHtml, string.Empty))
        using (var stream = new MemoryStream())
        {
            document.Save(stream);
            document.Close(true);

            using (var finalDoc = new PdfDocument())
            {
                finalDoc.PageSettings.Size = PdfPageSize.A4;

                Stream[] streams = { stream };
                PdfDocumentBase.Merge(finalDoc, streams);

                using (var reportStream = new MemoryStream())
                {
                    finalDoc.Save(reportStream);
                    finalDoc.Close(true);

                    return reportStream.ToArray();
                }
            }
        }
    }
    catch (Exception e)
    {
        Logger.Error($"StudentBill exception: {e.Message}");
        Logger.Error($"StudentBill stack: {e.StackTrace}");
        return null;
    }
}
    public async Task<byte[]> RenderStudentBillSummaryPdf(BillDto dto)
    {
    try
    {
        var filePath = Path.Combine(_webHostEnvironment.WebRootPath, "ReportTemplates", "StudentBillSummary.html");
        var htmlTemplate = await System.IO.File.ReadAllTextAsync(filePath);
        
       
       // footers
       var footersBuilder = new StringBuilder();
       
       foreach (var footer in dto.Footers.OrderBy(x => x.OrderNumber))
       {
           footersBuilder.Append($@"
               <li>{footer.Message}</li>");
       }
       
       var finalHtml = htmlTemplate
           .Replace("{{CompanyLogo}}", dto.CompanyLogo ?? "")
           .Replace("{{SchoolName}}", dto.SchoolName ?? "")
           .Replace("{{Address}}", dto.Address ?? "")
           .Replace("{{PhoneNo}}", dto.PhoneNo ?? "")
           .Replace("{{Email}}", dto.Email ?? "")
           .Replace("{{StudentName}}", dto.StudentName ?? "")
           .Replace("{{Currency}}", dto.Currency ?? "")
           .Replace("{{RegNo}}", dto.RegNo ?? "")
           .Replace("{{ClassName}}", dto.ClassName ?? "")
           .Replace("{{BillNo}}", dto.BillNo ?? "")
           .Replace("{{Period}}", dto.Period ?? "")
           .Replace("{{PreviousBalance}}", dto.PreviousBalance.ToString("N2"))
           .Replace("{{TotalAmount}}", dto.TotalAmount.ToString("N2"))
           .Replace("{{AmountToPay}}", dto.AmountToPay.ToString("N2"))
           .Replace("{{AcademicUserFee}}", dto.AcademicUserFeeTotal.ToString("N2"))
           .Replace("{{SupplementaryFee}}", dto.SupplementaryFeeTotal.ToString("N2"))
           .Replace("{{BoardingFee}}", dto.BoardingFeeTotal.ToString("N2"))
           .Replace("{{BillFooters}}", footersBuilder.ToString())
           .Replace("{{currentDate}}", DateTime.Now.ToString("dddd, MMMM dd, yyyy"))
           .Replace("{{PageNumber}}", "1");

        /* =========================================================
           4️⃣ CONVERT TO PDF
        ==========================================================*/

        var blinkEnginePath = Path.Combine(_webHostEnvironment.WebRootPath, "PdfEngine", "windows");

        var htmlConverter = new HtmlToPdfConverter(HtmlRenderingEngine.Blink);

        var blinkConverterSettings = new BlinkConverterSettings
        {
            BlinkPath = blinkEnginePath,
            Orientation = PdfPageOrientation.Portrait,
            EnableJavaScript = true,
            AdditionalDelay = 2000
        };

        htmlConverter.ConverterSettings = blinkConverterSettings;

        using (var document = htmlConverter.Convert(finalHtml, string.Empty))
        using (var stream = new MemoryStream())
        {
            document.Save(stream);
            document.Close(true);

            using (var finalDoc = new PdfDocument())
            {
                finalDoc.PageSettings.Size = PdfPageSize.A4;

                Stream[] streams = { stream };
                PdfDocumentBase.Merge(finalDoc, streams);

                using (var reportStream = new MemoryStream())
                {
                    finalDoc.Save(reportStream);
                    finalDoc.Close(true);

                    return reportStream.ToArray();
                }
            }
        }
    }
    catch (Exception e)
    {
        Logger.Error($"StudentBill exception: {e.Message}");
        Logger.Error($"StudentBill stack: {e.StackTrace}");
        return null;
    }
    }
    public async Task<object> DispatchStudentBillSummary(EmailBillDto dto)
    {
        // 1️⃣ Fetch SMTP credentials and school info
        var schoolProfile = await _profileRepo.GetAll().FirstOrDefaultAsync();
        if (schoolProfile == null)
            return new { code = 500, message = "School profile not found." };

        var smtpCredentials = new SmtpCredentials
        {
            PrimaryEmailAddress = schoolProfile.PrimaryEmailAddress,
            EmailPassword = schoolProfile.EmailPassword,
            MailHostName = schoolProfile.MailHostName,
            PortNumber = schoolProfile.PortNumber,
            IsSSLEnabled = schoolProfile.IsSSLEnabled,
            DefaultFromDisplayName = schoolProfile.SchoolName
        };

        if (dto.StudentIds == null || !dto.StudentIds.Any())
            return new { code = 400, message = "No students selected." };

        var dispatchedStudents = new List<string>();
        var skippedStudents = new List<string>();

        // 2️⃣ Loop through all selected students
        foreach (var studentId in dto.StudentIds)
        {
            try
            {
                // Fetch academic year and term for this iteration
                var academicYear = await _academicYearRepo.FirstOrDefaultAsync(a => a.Id == dto.AcademicYearId);
                var termsPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "terms.json"
                );


                var termsJson = await File.ReadAllTextAsync(termsPath);

                var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                            ?? new List<TermDto>();


                var term = terms.FirstOrDefault(x => x.Id == dto.TermId);
                var name = await GetStudentName(studentId);

                if (academicYear == null)
                {
                    skippedStudents.Add($"Student:{name} (academic year not found)");
                    continue;
                }

                if (term == null)
                {
                    skippedStudents.Add($"Student:{name} (term not found)");
                    continue;
                }

                // Build the BILL
                var reportDto = await BuildStudentBill(studentId, dto.AcademicYearId, dto.TermId);
                if (reportDto == null)
                {
                    skippedStudents.Add($"Student:{name} (report not generated)");
                    continue;
                }

                var pdfBytes = await RenderStudentBillSummaryPdf(reportDto);
                if (pdfBytes == null || pdfBytes.Length == 0)
                {
                    skippedStudents.Add($"Student:{name} (PDF not generated)");
                    continue;
                }

                // Fetch legal guardians
                var guardians = await _studentContactRelationshipRepo
                    .GetAllListAsync(c => c.StudentId == studentId && c.IsLegalGuardian);

                if (guardians == null || !guardians.Any())
                {
                    skippedStudents.Add($"Student:{name} (no legal guardians found)");
                    continue;
                }
                // Loop through all guardians for this student
                foreach (var guardian in guardians)
                {
                    if (string.IsNullOrWhiteSpace(guardian.Email))
                    {
                        skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (no email)");
                        continue;
                    }

                    // Clean email
                    var emailAddress = guardian.Email.Trim().Replace("\r", "").Replace("\n", "");

                    // Validate email format
                    try
                    {
                        var mailAddress = new System.Net.Mail.MailAddress(emailAddress);
                        emailAddress = mailAddress.Address;
                    }
                    catch
                    {
                        skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (invalid email: {emailAddress})");
                        continue;
                    }
                
                    var studentInfo = await _studentRepo.GetAsync(studentId);
                    var  studentName = studentInfo.FirstName + " " + studentInfo.LastName;

                    var email = new EmailMessage
                    {
                        To = new List<string> { emailAddress },
                        Subject = $"Student Bill - {schoolProfile.SchoolName}",
                        Body = $"Dear Guardian of {studentName},<br/><br/>" +
                               $"Please find attached the student bill for {term.Name} - {academicYear.Name}.<br/><br/>" +
                               $"Regards,<br/>{schoolProfile.SchoolName}"
                    };

                    var fileName = $"Student_Bill_{studentName}_{term.Name}_{academicYear.Name}.pdf";
                    email.Attachments.Add((pdfBytes, fileName, "application/pdf"));

                    try
                    {
                        await SendWithCompanyCredentials(email, smtpCredentials);
                        dispatchedStudents.Add($"{studentName} ({emailAddress})");
                    }
                    catch (Exception ex)
                    {
                        skippedStudents.Add($"{studentName} ({emailAddress}) (exception: {ex.Message})");
                    }
                }

            }
            catch (Exception ex)
            {
                var name = await GetStudentName(studentId);
                skippedStudents.Add($"Student:{name} (exception: {ex.Message})");
            }
        }
        return new
        {
            code = 200,
            message = $"Terminal reports dispatched: {dispatchedStudents.Count}. Skipped: {skippedStudents.Count}.",
            dispatched = dispatchedStudents,
            skipped = skippedStudents
        };
    }
    public async Task<object> DispatchStudentBill(EmailBillDto dto)
    {
        // 1️⃣ Fetch SMTP credentials and school info
        var schoolProfile = await _profileRepo.GetAll().FirstOrDefaultAsync();
        if (schoolProfile == null)
            return new { code = 500, message = "School profile not found." };

        var smtpCredentials = new SmtpCredentials
        {
            PrimaryEmailAddress = schoolProfile.PrimaryEmailAddress,
            EmailPassword = schoolProfile.EmailPassword,
            MailHostName = schoolProfile.MailHostName,
            PortNumber = schoolProfile.PortNumber,
            IsSSLEnabled = schoolProfile.IsSSLEnabled,
            DefaultFromDisplayName = schoolProfile.SchoolName
        };

        if (dto.StudentIds == null || !dto.StudentIds.Any())
            return new { code = 400, message = "No students selected." };

        var dispatchedStudents = new List<string>();
        var skippedStudents = new List<string>();

        // 2️⃣ Loop through all selected students
        foreach (var studentId in dto.StudentIds)
        {
            try
            {
                // Fetch academic year and term for this iteration
                var academicYear = await _academicYearRepo.FirstOrDefaultAsync(a => a.Id == dto.AcademicYearId);
                var termsPath = Path.Combine(
                    _webHostEnvironment.WebRootPath,
                    "jsonDataSample",
                    "terms.json"
                );


                var termsJson = await File.ReadAllTextAsync(termsPath);

                var terms = JsonConvert.DeserializeObject<List<TermDto>>(termsJson)
                            ?? new List<TermDto>();


                var term = terms.FirstOrDefault(x => x.Id == dto.TermId);
                var name = await GetStudentName(studentId);

                if (academicYear == null)
                {
                    skippedStudents.Add($"Student:{name} (academic year not found)");
                    continue;
                }

                if (term == null)
                {
                    skippedStudents.Add($"Student:{name} (term not found)");
                    continue;
                }

                // Build the BILL
                var reportDto = await BuildStudentBill(studentId, dto.AcademicYearId, dto.TermId);
                if (reportDto == null)
                {
                    skippedStudents.Add($"Student:{name} (report not generated)");
                    continue;
                }

                var pdfBytes = await RenderStudentBillPdf(reportDto);
                if (pdfBytes == null || pdfBytes.Length == 0)
                {
                    skippedStudents.Add($"Student:{name} (PDF not generated)");
                    continue;
                }

                // Fetch legal guardians
                var guardians = await _studentContactRelationshipRepo
                    .GetAllListAsync(c => c.StudentId == studentId && c.IsLegalGuardian);

                if (guardians == null || !guardians.Any())
                {
                    skippedStudents.Add($"Student:{name} (no legal guardians found)");
                    continue;
                }
                // Loop through all guardians for this student
                foreach (var guardian in guardians)
                {
                    if (string.IsNullOrWhiteSpace(guardian.Email))
                    {
                        skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (no email)");
                        continue;
                    }

                    // Clean email
                    var emailAddress = guardian.Email.Trim().Replace("\r", "").Replace("\n", "");

                    // Validate email format
                    try
                    {
                        var mailAddress = new System.Net.Mail.MailAddress(emailAddress);
                        emailAddress = mailAddress.Address;
                    }
                    catch
                    {
                        skippedStudents.Add($"{guardian.FirstName} {guardian.LastName} (invalid email: {emailAddress})");
                        continue;
                    }
                
                    var studentInfo = await _studentRepo.GetAsync(studentId);
                    var  studentName = studentInfo.FirstName + " " + studentInfo.LastName;

                    var email = new EmailMessage
                    {
                        To = new List<string> { emailAddress },
                        Subject = $"Student Bill - {schoolProfile.SchoolName}",
                        Body = $"Dear Guardian of {studentName},<br/><br/>" +
                               $"Please find attached the student bill for {term.Name} - {academicYear.Name}.<br/><br/>" +
                               $"Regards,<br/>{schoolProfile.SchoolName}"
                    };

                    var fileName = $"Student_Bill_{studentName}_{term.Name}_{academicYear.Name}.pdf";
                    email.Attachments.Add((pdfBytes, fileName, "application/pdf"));

                    try
                    {
                        await SendWithCompanyCredentials(email, smtpCredentials);
                        dispatchedStudents.Add($"{studentName} ({emailAddress})");
                    }
                    catch (Exception ex)
                    {
                        skippedStudents.Add($"{studentName} ({emailAddress}) (exception: {ex.Message})");
                    }
                }

            }
            catch (Exception ex)
            {
                var name = await GetStudentName(studentId);
                skippedStudents.Add($"Student:{name} (exception: {ex.Message})");
            }
        }
        return new
        {
            code = 200,
            message = $"Terminal reports dispatched: {dispatchedStudents.Count}. Skipped: {skippedStudents.Count}.",
            dispatched = dispatchedStudents,
            skipped = skippedStudents
        };
    }
}

