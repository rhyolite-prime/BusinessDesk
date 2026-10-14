using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Abp.Authorization;
using Abp.Domain.Repositories;
using Abp.Web.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Syncfusion.XlsIO;
using TopazERP.Authorization;
using TopazERP.Controllers;
using TopazERP.DomainServices.SchoolManger.RemarkByTeachers;
using TopazERP.DomainServices.SchoolManger.StudentBios;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;
using TopazERP.Services.SchoolManager.AcademicYears;
using TopazERP.Services.SchoolManager.Assignments;
using TopazERP.Services.SchoolManager.Assignments.Dto;
using TopazERP.Services.SchoolManager.BehavioralAssessments;
using TopazERP.Services.SchoolManager.BehavioralAssessments.Dto;
using TopazERP.Services.SchoolManager.ClassAttendances;
using TopazERP.Services.SchoolManager.ClassAttendances.Dto;
using TopazERP.Services.SchoolManager.LevelsAndClasses;
using TopazERP.Services.SchoolManager.OpeningBalances;
using TopazERP.Services.SchoolManager.OpeningBalances.Dto;
using TopazERP.Services.SchoolManager.Payments;
using TopazERP.Services.SchoolManager.Payments.Dto;
using TopazERP.Services.SchoolManager.RemarkByTeachers;
using TopazERP.Services.SchoolManager.RemarkByTeachers.Dto;
using TopazERP.Services.SchoolManager.StContactRelationships;
using TopazERP.Services.SchoolManager.StudentBios;
using TopazERP.Services.SchoolManager.StudentBios.Dto;
using Stream = TopazERP.Models.Sch.Stream;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Sm_ImportData)]
public class SmImportDataController : TopazERPControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IOpeningBalanceAppService _openingBalanceAppService;
    private readonly IRepository<StudentInfo, Guid> _studentRepository;
    private readonly IAssignmentAppService _assignmentAppService;
    private readonly IStudentBioAppService _studentBioAppService;
    private readonly IBehavioralAssessmentAppService _behavioralAssessmentAppService;
    private readonly IStContactRelationshipAppService _stContactRelationshipAppService;
    private readonly IRepository<LevelClass, Guid> _levelClassRepository;
    private readonly IRepository<Class, Guid> _classRepository;
    private readonly IRepository<Stream, Guid> _streamRepository;
    private readonly IRepository<StContactRelationship, Guid> _stContactRelationshipRepository;
    private readonly IRepository<Country, Guid> _countryRepository;
    private readonly IRepository<Religion, Guid> _religionRepository;
    private readonly IRepository<StudentStatus, Guid> _statusRepository;
    private readonly IRepository<AcademicYear, Guid> _academicYearRepository;
    private readonly IRepository<Hostel, Guid> _hostelRepository;
    private readonly IRemarkByTeacherAppService _remarkByTeacherAppService;
    private readonly IAttendanceAppService _attendanceAppService;
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly IRepository<Currency, Guid> _currencyRepository;
    private readonly IPaymentAppService _paymentAppService;
    private readonly IRepository<Bank, Guid> _bankRepository;
    private readonly IRepository<SchoolProfile, Guid> _schoolProfileRepository;
    private readonly IRepository<StudentOpeningBalance, Guid> _studentOpeningBalanceRepository;
    
    

    public SmImportDataController(IWebHostEnvironment env, IOpeningBalanceAppService openingBalanceAppService,
        IRepository<StudentInfo, Guid> studentRepository, IAssignmentAppService assignmentAppService, IStudentBioAppService studentBioAppService, IBehavioralAssessmentAppService behavioralAssessmentAppService, IStContactRelationshipAppService stContactRelationshipAppService, IRepository<LevelClass, Guid> levelClassRepository, IRepository<StContactRelationship, Guid> stContactRelationshipRepository, IRepository<Country, Guid> countryRepository, IRepository<Religion, Guid> religionRepository, IRepository<AcademicYear, Guid> academicYearRepository, IRepository<Hostel, Guid> hotelRepository, IRepository<StudentStatus, Guid> statusRepository, IRepository<Class, Guid> classRepository, IRepository<Stream, Guid> streamRepository, IRemarkByTeacherAppService remarkByTeacherAppService, IAttendanceAppService attendanceAppService, IWebHostEnvironment webHostEnvironment, IRepository<Currency, Guid> currencyRepository, IPaymentAppService paymentAppService, IRepository<Bank, Guid> bankRepository, IRepository<SchoolProfile, Guid> schoolProfileRepository, IRepository<StudentOpeningBalance, Guid> studentOpeningBalanceRepository)
    {
        _env = env;
        _openingBalanceAppService = openingBalanceAppService;
        _studentRepository = studentRepository;
        _assignmentAppService = assignmentAppService;
        _studentBioAppService = studentBioAppService;
        _behavioralAssessmentAppService = behavioralAssessmentAppService;
        _stContactRelationshipAppService = stContactRelationshipAppService;
        _levelClassRepository = levelClassRepository;
        _stContactRelationshipRepository = stContactRelationshipRepository;
        _countryRepository = countryRepository;
        _religionRepository = religionRepository;
        _academicYearRepository = academicYearRepository;
        _hostelRepository = hotelRepository;
        _statusRepository = statusRepository;
        _classRepository = classRepository;
        _streamRepository = streamRepository;
        _remarkByTeacherAppService = remarkByTeacherAppService;
        _attendanceAppService = attendanceAppService;
        _webHostEnvironment = webHostEnvironment;
        _currencyRepository = currencyRepository;
        _paymentAppService = paymentAppService;
        _bankRepository = bankRepository;
        _schoolProfileRepository = schoolProfileRepository;
        _studentOpeningBalanceRepository = studentOpeningBalanceRepository;
    }

    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportOpeningBalances)]
    public IActionResult OpeningBalance()
    {
        return View();
    }

    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportResults)]
    public IActionResult ClassAssignment1()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportResults)]
    public IActionResult ClassAssignment2()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportResults)]
    public IActionResult ClassAssignment3()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportResults)]
    public IActionResult ClassAssignment4()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportResults)]
    public IActionResult Exam()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportResults)]
    public IActionResult MidTerm()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportConductAndAttitude)]
    public IActionResult Attitude()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportConductAndAttitude)]
    public IActionResult Interest()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportConductAndAttitude)]
    public IActionResult Conduct()
    {
        return View();
    }
    
    public IActionResult ParentImport()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportStudents)]
    public IActionResult StudentImport()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportTeacherRemarks)]
    public IActionResult ClassTeacherRemark()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportTeacherRemarks)]
    public IActionResult HeadTeacherRemark()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportTeacherRemarks)]
    public IActionResult MidTermHeadTeacherRemark()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportTeacherRemarks)]
    public IActionResult MidTermClassTeacherRemark()
    {
        return View();
    }
    [AbpAuthorize(PermissionNames.Sm_ImportData_ImportAttendance)]
    public IActionResult Attendance()
    {
        return View();
    }
   
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBalances()
    {
        var result = await _openingBalanceAppService.ListAll();
        return Json(result);
    }
    public class StatusDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
    }
    //open balance
    public async Task<IActionResult> UploadSample( Guid academicYearId, Guid classId)
    {
        var statusPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "studentStatuses.json"
        );

        var statusJson = await System.IO.File.ReadAllTextAsync(statusPath);

        var statuses = JsonConvert.DeserializeObject<List<StatusDto>>(statusJson)
                       ?? new List<StatusDto>();

        // Get IDs of statuses that are considered active
        var activeStatusIds = statuses
            .Where(x => x.IsActive)
            .Select(x => x.Id)
            .ToList();

// Get students with active statuses
        var students = await _studentRepository
            .GetAllListAsync(s =>
                s.ClassId == classId &&
                s.AcademicYearId == academicYearId &&
                activeStatusIds.Contains(s.StatusId)
            );
        using (ExcelEngine excelEngine = new ExcelEngine())
        {
            excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

            IWorkbook workbook = excelEngine.Excel.Workbooks.Create(1);
            IWorksheet sheet = workbook.Worksheets[0];

            sheet.Name = "StudentOpeningBalances";

            // Headers
            sheet.Range["A1"].Text = "No.";
            sheet.Range["B1"].Text = "Reg No";
            sheet.Range["C1"].Text = "Student Name";
            sheet.Range["D1"].Text = "Amount";
            sheet.Range["E1"].Text = "Currency";
            sheet.Range["F1"].Text = "Date";

            int row = 2;
            int count = 1;
            foreach (var s in students)
            {
                sheet.Range[$"A{row}"].Number = count;
                sheet.Range[$"B{row}"].Text = s.StudentIdentifier;
                sheet.Range[$"C{row}"].Text = $"{s.FirstName} {s.OtherName} {s.LastName}";
                sheet.Range[$"D{row}"].Number = 0;
                sheet.Range[$"E{row}"].Text = "Ghana Cedi";
                sheet.Range[$"F{row}"].DateTime = DateTime.Now;
                count++;
                row++;
            }

            using (var ms = new MemoryStream())
            {
                workbook.SaveAs(ms);
                ms.Position = 0;

                return File(
                    ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"StudentOpeningBalances.xlsx"
                );
            }
        }

    }
    public class StudentOpeningBalancePreviewDto
    {
        public Guid StudentId { get; set; }
        public string StudentIdentifier { get; set; }
        public string StudentName { get; set; }
        public decimal Amount { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public DateTime? Date { get; set; }
        
        public string Error { get; set; }
        
    }
    public class ImportStudentOpeningBalanceInput
    {
        public Guid AcademicYearId { get; set; }
        public Guid ClassId { get; set; }
        public List<StudentOpeningBalancePreviewDto> Records { get; set; }
    }
    [HttpPost]
    public async Task<IActionResult> PreviewOpeningBalances(IFormFile customFile, Guid classId)
    {
        var result = new List<StudentOpeningBalancePreviewDto>();

        ExcelEngine excelEngine = new ExcelEngine();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
        IWorksheet worksheet = workbook.Worksheets[0];

        DataTable excelTable = worksheet.ExportDataTable(
            worksheet.UsedRange,
            ExcelExportDataTableOptions.ColumnNames
        );

        foreach (DataRow row in excelTable.Rows)
        {
            // Skip completely empty rows
            if (row.ItemArray.All(x =>
                    x == null ||
                    string.IsNullOrWhiteSpace(x.ToString())))
            {
                continue;
            }
            
            var dto = new StudentOpeningBalancePreviewDto();
            
            dto.StudentIdentifier = row["Reg No"]?.ToString();
            dto.StudentName = row["Student Name"]?.ToString();
            dto.CurrencyName = row["Currency"]?.ToString();
       
            

            // Identifier validation
            if (string.IsNullOrWhiteSpace(dto.StudentIdentifier))
            {
                dto.Error = "Student Identifier is required";
                result.Add(dto);
                continue;
            }

            // Amount validation
            if (!decimal.TryParse(row["Amount"]?.ToString(), out var amount))
            {
                dto.Error = "Invalid amount";
                result.Add(dto);
                continue;
            }

            dto.Amount = amount;
            var dateStr = row["Date"]?.ToString();
            if (!string.IsNullOrWhiteSpace(dateStr) && DateTime.TryParse(dateStr, out var parsedDate))
            {
                dto.Date = parsedDate;
            }
            else
            {
                dto.Date = DateTime.Now;
            }

            // 🔥 Student existence check
            var student = await _studentRepository
                .FirstOrDefaultAsync(x => x.StudentIdentifier == dto.StudentIdentifier);

            if (student == null)
            {
                dto.Error = "Student not found";
                result.Add(dto);
                continue;
            }

            // 🔥 Class membership check
            if (student.ClassId != classId)
            {
                dto.Error = "Student not in selected class";
                result.Add(dto);
                continue;
            }
            
            // currency
            if (string.IsNullOrWhiteSpace(dto.CurrencyName))
            {
                dto.Error = "Currency is required";
                result.Add(dto);
                continue;
            }

            var currency = await _currencyRepository
                .FirstOrDefaultAsync(x => x.CurrencyName == dto.CurrencyName);

            if (currency == null)
            {
                dto.Error = "Currency not found";
                result.Add(dto);
                continue;
            }
            dto.CurrencyId = currency.Id;
            dto.StudentId = student.Id;
            
            // check if student has balance with same currencyid
            var openingBalances = await _studentOpeningBalanceRepository.FirstOrDefaultAsync(x => x.StudentId == student.Id && x.CurrencyId == currency.Id);
            if (openingBalances != null)
            {
                dto.Error = "Student already has an opening balance in this currency";
                result.Add(dto);
                continue;
            }
            
            // ✅ If we reach here → OK
            dto.Error = null;

            result.Add(dto);
        }

        return Ok(result);
    }
    [HttpPost]
    public async Task<IActionResult> ImportOpeningBalances([FromBody] ImportStudentOpeningBalanceInput input)
    {
        foreach (var item in input.Records)
        {
            if (!string.IsNullOrEmpty(item.Error))
                continue;

            var student = await _studentRepository
                .FirstOrDefaultAsync(x => x.StudentIdentifier == item.StudentIdentifier);

            if (student == null)
                continue;
            var currency = await _currencyRepository.FirstOrDefaultAsync(x => x.CurrencyName == item.CurrencyName);;
            var createInput = new CreateStudentOpeningBalanceInput
            {
                AcademicYearId = input.AcademicYearId,
                ClassId = input.ClassId,
                StudentId = student.Id,
                StudentIdentifier = student.StudentIdentifier,
                StudentName = $"{student.FirstName} {student.OtherName} {student.LastName}",
                Amount = item.Amount,
                CurrencyId = currency.Id,
                Rate = currency.BuyRate,
                Date = item.Date ?? DateTime.MinValue,
                IsPosted = true
            };

            await _openingBalanceAppService.Create(createInput);
            
        }
        var balances = await _studentOpeningBalanceRepository.GetAllListAsync();
        return Ok(new { message = "Import completed", data = balances}); 
    }
    
    // assignments
    [HttpGet]
    public async Task<IActionResult> DownloadAssignmentTemplate(Guid academicYearId, Guid termId, Guid classId, Guid subjectId)
    {
        var statusPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "studentStatuses.json"
        );

        var statusJson = await System.IO.File.ReadAllTextAsync(statusPath);

        var statuses = JsonConvert.DeserializeObject<List<StatusDto>>(statusJson)
                       ?? new List<StatusDto>();

        // Get IDs of statuses that are considered active
        var activeStatusIds = statuses
            .Where(x => x.IsActive)
            .Select(x => x.Id)
            .ToList();

        //Get students with active statuses
        var students = await _studentRepository
            .GetAllListAsync(s =>
                s.ClassId == classId &&
                s.AcademicYearId == academicYearId &&
                activeStatusIds.Contains(s.StatusId)
            );
     
        using (ExcelEngine excelEngine = new ExcelEngine())
        {
            excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

            IWorkbook workbook = excelEngine.Excel.Workbooks.Create(1);
            IWorksheet sheet = workbook.Worksheets[0];

            sheet.Name = "Assignments";

            // Headers
            sheet.Range["A1"].Text = "No.";
            sheet.Range["B1"].Text = "Reg No";
            sheet.Range["C1"].Text = "Student Name";
            sheet.Range["D1"].Text = "Marks";

            int row = 2;
            int count = 1;
            foreach (var s in students)
            {
                sheet.Range[$"A{row}"].Number = count;
                sheet.Range[$"B{row}"].Text = s.StudentIdentifier;
                sheet.Range[$"C{row}"].Text = $"{s.FirstName} {s.OtherName} {s.LastName}";
                sheet.Range[$"D{row}"].Number = 0;
                count++;
                row++;
            }

            using (var ms = new MemoryStream())
            {
                workbook.SaveAs(ms);
                ms.Position = 0;

                return File(
                    ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Assignments.xlsx"
                );
            }
        }
    }
    public class AssignmentPreviewDto
    {
        public Guid Id { get; set; }
        public Guid StudentId { get; set; }
        public string StudentIdentifier { get; set; }
        public string StudentName { get; set; }
        public decimal Marks { get; set; }
        public string Error { get; set; }
    }
    [HttpPost]
    public async Task<IActionResult> PreviewAssignments(IFormFile customFile, Guid classId, decimal overallMark)
    {
        var result = new List<AssignmentPreviewDto>();

        ExcelEngine excelEngine = new ExcelEngine();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
        IWorksheet worksheet = workbook.Worksheets[0];

        DataTable excelTable = worksheet.ExportDataTable(
            worksheet.UsedRange,
            ExcelExportDataTableOptions.ColumnNames
        );

        foreach (DataRow row in excelTable.Rows)
        {
            if (row.ItemArray.All(x =>
                    x == null ||
                    string.IsNullOrWhiteSpace(x.ToString())))
            {
                continue;
            }
            var dto = new AssignmentPreviewDto
            {
                Id = Guid.NewGuid(),
                StudentIdentifier = row["Reg No"]?.ToString(),
                StudentName = row["Student Name"]?.ToString(),
                Marks = row["Marks"] != null ? decimal.Parse(row["Marks"].ToString()) : 0
            };
            var marksCell = row["Marks"]?.ToString()?.Trim();
            // Identifier
            if (string.IsNullOrWhiteSpace(dto.StudentIdentifier))
            {
                dto.Error = "Student identifier is required";
                result.Add(dto);
                continue;
            }
            // Student existence
            var student = await _studentRepository
                .FirstOrDefaultAsync(x => x.StudentIdentifier == dto.StudentIdentifier);

            if (student == null)
            {
                dto.Error = "Student not found";
                result.Add(dto);
                continue;
            }
            // validate marks 
            if (dto.Marks > overallMark)
            {
                dto.Error = "Marks cannot be greater than overall marks";
                result.Add(dto);
                continue;
            }

            if (dto.Marks < 0)
            {
                dto.Error = "Marks cannot be negative";
                result.Add(dto);
                continue;
            }
            
            if (string.IsNullOrWhiteSpace(marksCell))
            {
                dto.Error = "Marks field is empty";
                result.Add(dto);
                continue;
            }
            if (!decimal.TryParse(marksCell, out decimal parsedMarks))
            {
                dto.Error = "Invalid marks format";
                result.Add(dto);
                continue;
            }

            dto.Marks = parsedMarks;

            // Class check
            if (student.ClassId != classId)
            {
                dto.Error = "Student not in selected class";
                result.Add(dto);
                continue;
            }
            dto.StudentId = student.Id;

            dto.Error = null;
            result.Add(dto);
        }
        return Ok(result);
    }
    [HttpPost]
    public async Task<IActionResult> ImportAssignments([FromBody] CreateAssignmentInput input)
    {
        if (input == null || input.Details == null || input.Details.Count == 0)
            return BadRequest("No assignment records to import");

        var result = await _assignmentAppService.Create(input);

        return Ok(result);
    }

    // behavioral assessments
    [HttpGet]
    public async Task<IActionResult> UploadBehavioralSheet( Guid academicYearId, Guid classId, string assessmentType)
    {
        var statusPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "studentStatuses.json"
        );

        var statusJson = await System.IO.File.ReadAllTextAsync(statusPath);

        var statuses = JsonConvert.DeserializeObject<List<StatusDto>>(statusJson)
                       ?? new List<StatusDto>();

        // Get IDs of statuses that are considered active
        var activeStatusIds = statuses
            .Where(x => x.IsActive)
            .Select(x => x.Id)
            .ToList();

// Get students with active statuses
        var students = await _studentRepository
            .GetAllListAsync(s =>
                s.ClassId == classId &&
                s.AcademicYearId == academicYearId &&
                activeStatusIds.Contains(s.StatusId)
            );
        using (ExcelEngine excelEngine = new ExcelEngine())
        {
            excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

            IWorkbook workbook = excelEngine.Excel.Workbooks.Create(1);
            IWorksheet sheet = workbook.Worksheets[0];

            if (assessmentType == "Attitude") sheet.Name = "Attitude";
            else if (assessmentType == "Interest") sheet.Name = "Interest";
            else if (assessmentType == "Conduct") sheet.Name = "Conduct";
            else sheet.Name = "BehavioralAssessment";

            if (assessmentType == "Attitude")
            {
                sheet.Range["A1"].Text = "No.";
                sheet.Range["B1"].Text = "Reg No";
                sheet.Range["C1"].Text = "Student Name";
                sheet.Range["D1"].Text = "Attitude";
            }
            else if (assessmentType == "Interest")
            {
                sheet.Range["A1"].Text = "No.";
                sheet.Range["B1"].Text = "Reg No";
                sheet.Range["C1"].Text = "Student Name";
                sheet.Range["D1"].Text = "Interest";
            }
            else if (assessmentType == "Conduct")
            {
                sheet.Range["A1"].Text = "No.";
                sheet.Range["B1"].Text = "Reg No";
                sheet.Range["C1"].Text = "Student Name";
                sheet.Range["D1"].Text = "Conduct";
            }
            int row = 2;
            int count = 1;
            foreach (var s in students)
            {
                sheet.Range[$"A{row}"].Number = count;
                sheet.Range[$"B{row}"].Text = s.StudentIdentifier;
                sheet.Range[$"C{row}"].Text = $"{s.FirstName} {s.OtherName} {s.LastName}";
                sheet.Range[$"D{row}"].Text = "";
                count++;
                row++;
            }
            using (var ms = new MemoryStream())
            {
                workbook.SaveAs(ms);
                ms.Position = 0;

                return File(
                    ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"{assessmentType}.xlsx"
                );
            }
        }

    }
    public class BehavioralAssessmentPreviewDto
        {
           public Guid Id { get; set; }
           public Guid StudentId { get; set; }
           public string StudentIdentifier { get; set; }
           public string StudentName { get; set; }
           public string Description { get; set; }
           public string Error { get; set; }
        }
    [HttpPost]
    public async Task<IActionResult> PreviewBehavioralAssessments(IFormFile customFile, Guid classId, string assessmentType)
    {
        var result = new List<BehavioralAssessmentPreviewDto>();

        ExcelEngine excelEngine = new ExcelEngine();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
        IWorksheet worksheet = workbook.Worksheets[0];

        DataTable excelTable = worksheet.ExportDataTable(
            worksheet.UsedRange,
            ExcelExportDataTableOptions.ColumnNames
        );
        string descriptionColumn = assessmentType switch
        {
            "Attitude" => "Attitude",
            "Interest" => "Interest",
            "Conduct" => "Conduct",
            _ => null
        };

        foreach (DataRow row in excelTable.Rows)
        {
            if (descriptionColumn != null)
            {
                if (row.ItemArray.All(x =>
                        x == null ||
                        string.IsNullOrWhiteSpace(x.ToString())))
                {
                    continue;
                }
                var dto = new BehavioralAssessmentPreviewDto
                {
                    Id = Guid.NewGuid(),
                    
                    StudentIdentifier = row["Reg No"]?.ToString(),
                    StudentName = row["Student Name"]?.ToString(),
                    Description = row[descriptionColumn]?.ToString()
                };


                // Identifier
                if (string.IsNullOrWhiteSpace(dto.StudentIdentifier))
                {
                    dto.Error = "Student identifier is required";
                    result.Add(dto);
                    continue;
                }
                if (string.IsNullOrWhiteSpace(dto.Description))
                {
                    dto.Error = $"{assessmentType} is required";
                    result.Add(dto);
                    continue;
                }


                // Student existence
                var student = await _studentRepository
                    .FirstOrDefaultAsync(x => x.StudentIdentifier == dto.StudentIdentifier);

                if (student == null)
                {
                    dto.Error = "Student not found";
                    result.Add(dto);
                    continue;
                }

                // Class check
                if (student.ClassId != classId)
                {
                    dto.Error = "Student not in selected class";
                    result.Add(dto);
                    continue;
                }
                dto.StudentId = student.Id;
                dto.Error = null;
                result.Add(dto);
            }
        }

        return Ok(result);
    }
    [HttpPost]
    public async Task<IActionResult> ImportAssessment([FromBody] CreateBehavioralAssessmentInput input)
    {
        if (input == null || input.Assessments == null || input.Assessments.Count == 0)
            return BadRequest("No behavioral assessment records to import");
        var result = await _behavioralAssessmentAppService.Create(input);
        return Ok(result);
        
    }
    //students
    public class StudentPreviewDto
    {
        public string StudentIdentifier { get; set; }
        public string IndexNumber { get; set; }
        public string LastName { get; set; }
        public string FirstName { get; set; }
        public string OtherName { get; set; }
        public string Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string Nationality { get; set; }
        public string CountryName { get; set; }
        public string Religion { get; set; }
        public string ClassName { get; set; }
        public string AcademicYear { get; set; }
        public string Status { get; set; }
        public bool IsBoarder { get; set; }
        public string Hostel { get; set; }
        public DateTime? AdmissionDate { get; set; }
        public bool IsPreClassStudent { get; set; }

        public Guid CountryId { get; set; }
        public Guid ReligionId { get; set; }
        public Guid ClassId { get; set; }
        public Guid AcademicYearId { get; set; }
        public Guid HostelId { get; set; }
        public Guid StatusId { get; set; }
        

        public string Error { get; set; }
        public string Warning { get; set; }
    }
    
    private DateTime? SafeParseDate(object value)
    {
        if (value == null || value == DBNull.Value) return null;

        // 1) Already a DateTime (best case)
        if (value is DateTime dt) return dt;

        // 2) Excel serial number (OADate) - often comes as double/decimal/int
        if (value is double d) return DateTime.FromOADate(d);
        if (value is float f)  return DateTime.FromOADate(f);
        if (value is decimal m) return DateTime.FromOADate((double)m);
        if (value is int i)    return DateTime.FromOADate(i);
        if (value is long l)   return DateTime.FromOADate(l);

        // 3) String date (when user typed it as text or Excel stored as text)
        var s = value.ToString()?.Trim();
        if (string.IsNullOrWhiteSpace(s)) return null;

        // Try common formats you may see in Ghana/Excel exports
        var formats = new[]
        {
            "dd/MM/yyyy", "d/M/yyyy",
            "MM/dd/yyyy", "M/d/yyyy",
            "yyyy-MM-dd", "dd-MM-yyyy", "d-M-yyyy",
            "dd.MM.yyyy", "d.MM.yyyy"
        };

        if (DateTime.TryParseExact(s, formats, CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces, out var exact))
            return exact;

        // fallback: system parsing (handles some Excel-like strings)
        if (DateTime.TryParse(s, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out var parsed))
            return parsed;

        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out parsed))
            return parsed;

        return null;
    }
    [HttpGet]
    public async Task<IActionResult> DownloadStudentTemplate()
    {
        var wwwRoot = _env.WebRootPath;

        byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "Student_Sample.xlsx"));
        return File(fileBytes, "application/ms-excel", "Student_Sample.xlsx");

    }

    private class CountryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Code { get; set; }
        public string Nationality { get; set; }
        public string numericIsoCode { get; set; }
    }

    private class ReligionDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }
    [HttpPost]
    public async Task<IActionResult> PreviewStudents(IFormFile customFile)
    {
        var result = new List<StudentPreviewDto>();

        // Load reference data
        var countriesPath = Path.Combine(_webHostEnvironment.WebRootPath, "jsonDataSample", "countries.json");

        var religionsPath = Path.Combine(_webHostEnvironment.WebRootPath, "jsonDataSample", "religions.json");

        var countriesJson = await System.IO.File.ReadAllTextAsync(countriesPath);

        var religionsJson = await System.IO.File.ReadAllTextAsync(religionsPath);

        var countries = JsonConvert.DeserializeObject<List<CountryDto>>(countriesJson);

        var religions = JsonConvert.DeserializeObject<List<ReligionDto>>(religionsJson);
        var classes = await _levelClassRepository.GetAllListAsync();
        var academicYears = await _academicYearRepository.GetAllListAsync();
        var statuses = await _statusRepository.GetAllListAsync();
        var hostels = await _hostelRepository.GetAllListAsync();
        var streams = await _streamRepository.GetAllListAsync();
        var mainClasses = await _classRepository.GetAllListAsync();

        ExcelEngine excelEngine = new ExcelEngine();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
        IWorksheet worksheet = workbook.Worksheets[0];

        DataTable excelTable = worksheet.ExportDataTable(
            worksheet.UsedRange,
            ExcelExportDataTableOptions.ColumnNames
        );

        foreach (DataRow row in excelTable.Rows)
        {
            var dto = new StudentPreviewDto
            {
                StudentIdentifier = row["Reg No"]?.ToString(),
                IndexNumber = null,
                LastName = row["Last Name"]?.ToString(),
                FirstName = row["First Name"]?.ToString(),
                OtherName = row["OtherName"]?.ToString(),
                Gender = row["Gender"]?.ToString(),
                DateOfBirth = SafeParseDate(row["Date of Birth"]),
                AdmissionDate = SafeParseDate(row["Admission Date"]),
                Nationality = row["Nationality"]?.ToString(),
                Religion = row["Religion"]?.ToString(),
                ClassName = row["Class"]?.ToString(),
                AcademicYear = row["Academic Year"]?.ToString(),
                Status = row["Status"]?.ToString(),
                Hostel = row["Hostel"]?.ToString(),
                IsBoarder = row["Is Boarder"] != DBNull.Value 
                            && row["Is Boarder"]?.ToString()?.Trim().Equals("true", StringComparison.OrdinalIgnoreCase) == true,

                IsPreClassStudent = row["Is Pre-Class Student"] != DBNull.Value 
                                    && row["Is Pre-Class Student"]?.ToString()?.Trim().Equals("true", StringComparison.OrdinalIgnoreCase) == true,
            };
            
            var existingRegNo = await _studentRepository.FirstOrDefaultAsync(s => s.StudentIdentifier == dto.StudentIdentifier);
           
            // Skip completely empty rows (the ones created by the large date formatting range)
            bool isCompletelyEmpty = true;
            foreach (object cellValue in row.ItemArray)
            {
                if (cellValue != null && cellValue != DBNull.Value && 
                    !string.IsNullOrWhiteSpace(cellValue.ToString().Trim()))
                {
                    isCompletelyEmpty = false;
                    break;
                }
            }
            if (isCompletelyEmpty) continue;
            // check first and last name
            if (string.IsNullOrWhiteSpace(dto.LastName))
            {
                dto.Error = "Last Name is required";
                result.Add(dto);
                continue;
            }

            if (string.IsNullOrWhiteSpace(dto.FirstName))
            {
                dto.Error = "First Name is required";
                result.Add(dto);
                continue;
            }
            //check reg no
            if (string.IsNullOrWhiteSpace(dto.StudentIdentifier))
            {
                dto.Error = "Reg No is required";
                result.Add(dto);
                continue;
            }
            // existing reg no
            if (existingRegNo != null)
            {
                dto.Error = "Reg No already exists";
                result.Add(dto);
                continue;
            }
          
            // Gender
            if (!string.IsNullOrWhiteSpace(dto.Gender) &&
                !new[] { "Male", "Female" }.Contains(dto.Gender, StringComparer.OrdinalIgnoreCase))
            {
                dto.Error = "Gender must be 'Male' or 'Female'";
                result.Add(dto);
                continue;
            }
            // Map Nationality
            if (!string.IsNullOrWhiteSpace(dto.Nationality))
            {
                var country = countries.FirstOrDefault(c =>
                    c.Nationality.Equals(dto.Nationality, StringComparison.OrdinalIgnoreCase));
                if (country == null)
                {
                    dto.Error = $"Nationality '{dto.Nationality}' not found in setups";
                    result.Add(dto);
                    continue;
                }

                dto.CountryId = country.Id;
                dto.CountryName = country.Name;
            }
            // Map Religion
            if (!string.IsNullOrWhiteSpace(dto.Religion))
            {
                var religion =
                    religions.FirstOrDefault(r => r.Name.Equals(dto.Religion, StringComparison.OrdinalIgnoreCase));
                if (religion == null)
                {
                    dto.Error = $"Religion '{dto.Religion}' not found in setups";
                    result.Add(dto);
                    continue;
                }

                dto.ReligionId = religion.Id;
            }
            if (!string.IsNullOrWhiteSpace(dto.ClassName))
            {
                var trimmed = dto.ClassName.Trim();

                Class mainClass = null;
                string streamPart = "";

                foreach (var mc in mainClasses)
                {
                    if (trimmed.StartsWith(mc.Name, StringComparison.OrdinalIgnoreCase))
                    {
                        mainClass = mc;
                        streamPart = trimmed.Substring(mc.Name.Length).Trim();
                        break;
                    }
                }
                if (mainClass == null)
                {
                    dto.Error = $"Main Class not found in setups for '{dto.ClassName}'";
                    result.Add(dto);
                    continue;
                }
                // Lookup Stream by name
                var stream = streams.FirstOrDefault(s =>
                    s.Name.Equals(streamPart, StringComparison.OrdinalIgnoreCase));

                if (stream == null)
                {
                    dto.Error = $"Stream '{streamPart}' not found in setups";
                    result.Add(dto);
                    continue;
                }
                // Lookup LevelClass using MainClassId + StreamId
                var levelClass = classes.FirstOrDefault(c =>
                    c.ClassId == mainClass.Id && c.StreamId == stream.Id);

                if (levelClass == null)
                {
                    dto.Error = $" Class '{mainClass.Name}''{stream.Name}' not found in setups";
                    result.Add(dto);
                    continue;
                }
                // Assign the LevelClassId to the DTO
                dto.ClassId = levelClass.Id;

            }
            // ----------------------------
            // WARNING: duplicate names
            // ----------------------------
            var duplicateInPreview = result.Any(r =>
                string.Equals(r.FirstName?.Trim(), dto.FirstName?.Trim(), StringComparison.OrdinalIgnoreCase) &&
                string.Equals(r.LastName?.Trim(), dto.LastName?.Trim(), StringComparison.OrdinalIgnoreCase) &&
                string.Equals(r.OtherName?.Trim(), dto.OtherName?.Trim(), StringComparison.OrdinalIgnoreCase));

            var duplicateInDatabase = false;
            if (dto.ClassId != Guid.Empty)
            {
                var studentsInDb = await _studentRepository.GetAllListAsync(s =>
                        s.ClassId == dto.ClassId &&
                        s.StudentIdentifier != dto.StudentIdentifier 
                );

                duplicateInDatabase = studentsInDb.Any(s =>
                    string.Equals(s.FirstName?.Trim(), dto.FirstName?.Trim(), StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(s.LastName?.Trim(), dto.LastName?.Trim(), StringComparison.OrdinalIgnoreCase) &&
                    string.Equals((s.OtherName ?? "").Trim(), (dto.OtherName ?? "").Trim(), StringComparison.OrdinalIgnoreCase)
                );
            }

            if (duplicateInPreview || duplicateInDatabase)
            {
                dto.Warning = "Name already exists in the database for this class - you can continue if this is a different student";
            }

            
            // Map Academic Year
            if (!string.IsNullOrWhiteSpace(dto.AcademicYear))
            {
                var year = academicYears.FirstOrDefault(a =>
                    a.Name.Equals(dto.AcademicYear, StringComparison.OrdinalIgnoreCase));
                if (year == null)
                {
                    dto.Error = $"Academic Year '{dto.AcademicYear}' not found in setups";
                    result.Add(dto);
                    continue;
                }

                dto.AcademicYearId = year.Id;
            }
            // Map Status
            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                var status =
                    statuses.FirstOrDefault(s => s.Name.Equals(dto.Status, StringComparison.OrdinalIgnoreCase));
                if (status == null)
                {
                    dto.Error = $"Status '{dto.Status}' not found in setups";
                    result.Add(dto);
                    continue;
                }

                dto.StatusId = status.Id;
            }
            // Map Hostel if boarder
            if (dto.IsBoarder && !string.IsNullOrWhiteSpace(dto.Hostel))
            {
                var hostel = hostels.FirstOrDefault(h => h.Name.Equals(dto.Hostel, StringComparison.OrdinalIgnoreCase));
                if (hostel == null)
                {
                    dto.Error = $"Hostel '{dto.Hostel}' not found";
                    result.Add(dto);
                    continue;
                }

                dto.HostelId = hostel.Id;
            }

            dto.Error = null;
            result.Add(dto);
        }

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> ImportStudents([FromBody] List<StudentPreviewDto> input)
{
    if (input == null || !input.Any())
        return BadRequest("No student records to import");

    var failed = new List<string>();
    foreach (var s in input)
    {
        if (!string.IsNullOrWhiteSpace(s.Error))
        {
            failed.Add($"{s.StudentIdentifier}: {s.Error}");
            continue;
        }

        try
        {
            var student = new CreateStudentBioInput
            {
                StudentIdentifier = s.StudentIdentifier ?? "",
                IndexNumber = s.IndexNumber ?? "",
                FirstName = s.FirstName ?? "",
                OtherName = s.OtherName ?? "",
                LastName = s.LastName ?? "",
                DateOfBirth = s.DateOfBirth ?? DateTime.MinValue,
                Gender = s.Gender ?? "",
                CountryId = s.CountryId,
                ReligionId = s.ReligionId,
                ClassId = s.ClassId,
                AcademicYearId = s.AcademicYearId,
                HostelId = s.HostelId,
                IsBoarder = s.IsBoarder,
                StatusId = s.StatusId,
                AdmissionDate = s.AdmissionDate ?? DateTime.MinValue,
                
                // All other fields empty/zero
                
                CityId = Guid.Empty,
                CityName = "",
                HouseNumber = "",
                LocationId = Guid.Empty,
                LocationName = "",
                ReligionName = "",
                ClassName = "",
                ContactNumber = "",
                Address = "",
                PhoneNumber = "",
                IsParentControl = false,
                AcademicYearName = "",
                Notes = "",
                StatusName = "Active",
                BalanceDue = 0,
                BalanceDueDate = DateTime.MinValue,
                IsPreClassStudent = false,
                HostelName = "",
                HostelBlockName = "",
                HouseId = Guid.Empty,
                HouseName = "",
                BillAs = "Local",
                isAlumni = false
            };

            var result = await _studentBioAppService.Import(student);
        }
        catch (Exception ex)
        {
            failed.Add($"{s.FirstName}: {ex.Message}");
        }
    }

    if (failed.Any())
        return Ok(new { code = 400, message = $"Some records failed: {string.Join(", ", failed)}" });

    return Ok(new { code = 200, message = "All students imported successfully" });
}

    //remarks
    [HttpGet]
    public async Task<IActionResult> UploadRemarkSheet( Guid academicYearId,Guid termId, Guid classId, string remarkType, string teacherType)
    {
        var statusPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "studentStatuses.json"
        );

        var statusJson = await System.IO.File.ReadAllTextAsync(statusPath);

        var statuses = JsonConvert.DeserializeObject<List<StatusDto>>(statusJson)
                       ?? new List<StatusDto>();

        // Get IDs of statuses that are considered active
        var activeStatusIds = statuses
            .Where(x => x.IsActive)
            .Select(x => x.Id)
            .ToList();

// Get students with active statuses
        var students = await _studentRepository
            .GetAllListAsync(s =>
                s.ClassId == classId &&
                s.AcademicYearId == academicYearId &&
                activeStatusIds.Contains(s.StatusId)
            );
        using (ExcelEngine excelEngine = new ExcelEngine())
        {
            excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

            IWorkbook workbook = excelEngine.Excel.Workbooks.Create(1);
            IWorksheet sheet = workbook.Worksheets[0];

            if (teacherType == "Head" && remarkType == "MidTerm") sheet.Name = "MidTerm Head Teacher Remarks";
            else if (teacherType == "Class" && remarkType == "MidTerm") sheet.Name = "MidTerm Class Teacher Remarks";
            else if (teacherType == "Head" && remarkType == "Overall") sheet.Name = "Head Teacher Remarks";
            else if (teacherType == "Class" && remarkType == "Overall") sheet.Name = "Class Teacher Remarks";
            else sheet.Name = "Remarks";

           
                sheet.Range["A1"].Text = "No.";
                sheet.Range["B1"].Text = "Reg No";
                sheet.Range["C1"].Text = "Student Name";
                sheet.Range["D1"].Text = "Remarks";
           
            int row = 2;
            int count = 1;
            foreach (var s in students)
            {
                sheet.Range[$"A{row}"].Number = count;
                sheet.Range[$"B{row}"].Text = s.StudentIdentifier;
                sheet.Range[$"C{row}"].Text = $"{s.FirstName} {s.OtherName} {s.LastName}";
                sheet.Range[$"D{row}"].Text = "";
                count++;
                row++;
            }
            using (var ms = new MemoryStream())
            {
                workbook.SaveAs(ms);
                ms.Position = 0;

                return File(
                    ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"{sheet.Name}.xlsx"
                );
            }
        }

    }

    public class PreviewRemarkDto
    {
        public Guid? StudentId { get; set; }
        public string StudentIdentifier { get; set; }
        public string StudentName { get; set; }
        public string Remark { get; set; }
        public string Error { get; set; }
    }
    public class ImportRemarksInput
    {
        public Guid AcademicYearId { get; set; }
        public Guid ClassId { get; set; }
        public Guid TermId { get; set; }
        public string RemarkType { get; set; }
        public string TeacherType { get; set; }
        public List<PreviewRemarkDto> Students { get; set; }

    }

    [HttpPost]
    public async Task<IActionResult> PreviewRemark(IFormFile customFile, Guid academicYearId, Guid termId, Guid classId, string remarkType, string teacherType)
{
    if (customFile == null || customFile.Length == 0)
        return Ok(new { result = new List<PreviewRemarkDto>() });

    // Load students once (fast lookup)
    var students = await _studentRepository.GetAllListAsync(
        s => s.ClassId == classId && s.AcademicYearId == academicYearId
    );

    var studentMap = students.ToDictionary(
        s => s.StudentIdentifier.Trim(),
        s => s
    );

    var result = new List<PreviewRemarkDto>();

    using (ExcelEngine excelEngine = new ExcelEngine())
    {
        excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

        using var stream = customFile.OpenReadStream();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(stream);
        IWorksheet sheet = workbook.Worksheets[0];

        int lastRow = sheet.UsedRange.LastRow;

        for (int row = 2; row <= lastRow; row++)
        {
            
            string regNo = sheet.Range[$"B{row}"].Text?.Trim();
            string remark = sheet.Range[$"D{row}"].Text?.Trim();

            var preview = new PreviewRemarkDto
            {
                StudentIdentifier = regNo,
                Remark = remark
            };

            if (string.IsNullOrWhiteSpace(regNo))
            {
                preview.Error = "Missing Reg No";
                result.Add(preview);
                continue;
            }

            if (!studentMap.TryGetValue(regNo, out var student))
            {
                preview.Error = "Student not found in this class";
                result.Add(preview);
                continue;
            }

            preview.StudentId = student.Id;
            preview.StudentName = $"{student.FirstName} {student.OtherName} {student.LastName}";

            if (string.IsNullOrWhiteSpace(remark))
            {
                preview.Error = "Remark is empty";
            }

            result.Add(preview);
        }
    }

    return Ok(result);
}

    [HttpPost]
    public async Task<IActionResult> ImportRemarks([FromBody] ImportRemarksInput input)
    {
        foreach (var item in input.Students)
        {
            if (!string.IsNullOrEmpty(item.Error))
                continue;

            var student = await _studentRepository
                .FirstOrDefaultAsync(x => x.StudentIdentifier == item.StudentIdentifier);

            if (student == null)
                continue;

            var createInput = new ImportRemarksDto
            {
                AcademicYearId = input.AcademicYearId,
                ClassId = input.ClassId,
                StudentId = student.Id,
                StudentIdentifier = student.StudentIdentifier,
                StudentName = $"{student.FirstName} {student.OtherName} {student.LastName}",
                Remark = item.Remark,
                RemarkType = input.RemarkType,
                TeacherType = input.TeacherType,
                TermId = input.TermId
                
            };

            await _remarkByTeacherAppService.Create(createInput);
        }

        return Ok(new { message = "Import completed" });
    }
    
    // attendance
    [HttpGet]
    public async Task<IActionResult> UploadAttendanceSheet( Guid academicYearId,Guid termId, Guid classId)
    {
        var statusPath = Path.Combine(
            _webHostEnvironment.WebRootPath,
            "jsonDataSample",
            "studentStatuses.json"
        );

        var statusJson = await System.IO.File.ReadAllTextAsync(statusPath);

        var statuses = JsonConvert.DeserializeObject<List<StatusDto>>(statusJson)
                       ?? new List<StatusDto>();

        // Get IDs of statuses that are considered active
        var activeStatusIds = statuses
            .Where(x => x.IsActive)
            .Select(x => x.Id)
            .ToList();

// Get students with active statuses
        var students = await _studentRepository
            .GetAllListAsync(s =>
                s.ClassId == classId &&
                s.AcademicYearId == academicYearId &&
                activeStatusIds.Contains(s.StatusId)
            );
        using (ExcelEngine excelEngine = new ExcelEngine())
        {
            excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

            IWorkbook workbook = excelEngine.Excel.Workbooks.Create(1);
            IWorksheet sheet = workbook.Worksheets[0];

               sheet.Name = "Attendance";

           
                sheet.Range["A1"].Text = "No.";
                sheet.Range["B1"].Text = "Reg No";
                sheet.Range["C1"].Text = "Student Name";
                sheet.Range["D1"].Text = "Attendance";
           
            int row = 2;
            int count = 1;
            foreach (var s in students)
            {
                sheet.Range[$"A{row}"].Number = count;
                sheet.Range[$"B{row}"].Text = s.StudentIdentifier;
                sheet.Range[$"C{row}"].Text = $"{s.FirstName} {s.OtherName} {s.LastName}";
                sheet.Range[$"D{row}"].Number = 0;
                count++;
                row++;
            }
            using (var ms = new MemoryStream())
            {
                workbook.SaveAs(ms);
                ms.Position = 0;

                return File(
                    ms.ToArray(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    $"Attendance.xlsx"
                );
            }
        }

    }
    public class PreviewAttendanceDto
    {
        public Guid? StudentId { get; set; }
        public string StudentIdentifier { get; set; }
        public string StudentName { get; set; }
        public int Attendance { get; set; }
        public string Error { get; set; }
    }
    public class ImportAttendanceInput
    {
        public Guid AcademicYearId { get; set; }
        public Guid ClassId { get; set; }
        public Guid TermId { get; set; }
        public List<PreviewAttendanceDto> Students { get; set; }

    }
    [HttpPost]
     public async Task<IActionResult> PreviewAttendance(IFormFile customFile, Guid academicYearId, Guid termId, Guid classId)
{
    if (customFile == null || customFile.Length == 0)
        return Ok(new { result = new List<PreviewAttendanceDto>() });

    // Load students once (fast lookup)
    var students = await _studentRepository.GetAllListAsync(
        s => s.ClassId == classId && s.AcademicYearId == academicYearId
    );

    var studentMap = students.ToDictionary(
        s => s.StudentIdentifier.Trim(),
        s => s
    );

    var result = new List<PreviewAttendanceDto>();

    using (ExcelEngine excelEngine = new ExcelEngine())
    {
        excelEngine.Excel.DefaultVersion = ExcelVersion.Excel2016;

        using var stream = customFile.OpenReadStream();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(stream);
        IWorksheet sheet = workbook.Worksheets[0];

        int lastRow = sheet.UsedRange.LastRow;

        for (int row = 2; row <= lastRow; row++)
        {
            string regNo = sheet.Range[$"B{row}"].Text?.Trim();
            int attendance = (int)sheet.Range[$"D{row}"].Number;

            var preview = new PreviewAttendanceDto
            {
                StudentIdentifier = regNo,
                Attendance = attendance
            };

            if (string.IsNullOrWhiteSpace(regNo))
            {
                preview.Error = "Missing Reg No";
                result.Add(preview);
                continue;
            }

            if (!studentMap.TryGetValue(regNo, out var student))
            {
                preview.Error = "Student not found in this class";
                result.Add(preview);
                continue;
            }

            preview.StudentId = student.Id;
            preview.StudentName = $"{student.FirstName} {student.OtherName} {student.LastName}";

            if (attendance < 0 )
            {
                preview.Error = "Attendance cannot be negative";
            }

            result.Add(preview);
        }
    }

    return Ok(result);
}
    [HttpPost]
    public async Task<IActionResult> ImportAttendance([FromBody] ImportAttendanceInput input)
    {
        foreach (var item in input.Students)
        {
            if (!string.IsNullOrEmpty(item.Error))
                continue;

            var student = await _studentRepository
                .FirstOrDefaultAsync(x => x.StudentIdentifier == item.StudentIdentifier);

            if (student == null)
                continue;

            var createInput = new CreateCumulativeAttendanceInput()
            {
                AcademicYearId = input.AcademicYearId,
                ClassId = input.ClassId,
                StudentId = student.Id,
                Days = item.Attendance,
                TermId = input.TermId
                
            };

            await _attendanceAppService.CreateAttendance(createInput);
        }

        return Ok(new { message = "Import completed" });
    }
    
    // payments
    public class PreviewPaymentDto
    {
        public Guid StudentId { get; set; }
        public string StudentIdentifier { get; set; }
        public string StudentName { get; set; }
        public string Description { get; set; }
        public decimal PaymentAmount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string ReferenceNumber { get; set; }
        public Guid BankId { get; set; }
        public string BankName { get; set; }
        public string BranchName { get; set; }
        public string ChequeNumber { get; set; }
        public DateTime? ChequeDate { get; set; }
        public Guid AcademicYearId { get; set; }
        public Guid TermId { get; set; }
        public Guid ClassId { get; set; }
        public decimal AmountDue { get; set; }
        public decimal AmountToPaid { get; set; }
        public int PaymentMethod { get; set; }
       
        public string BatchNumber { get; set; }
        public decimal BuyRate { get; set; }
        public Guid BankGlId { get; set; }
        public Guid BankBranchId { get; set; }
        
        public string ReceiptNumber { get; set; }
        public Guid LegalGuardianId { get; set; }
        
        public Guid CreditGlId { get; set; }
        public Guid DebitGlId { get; set; }
        public bool IsMultiCurrency { get; set; }
        public string Error { get; set; }
    }
    
    public async Task<IActionResult> DownloadPaymentTemplate()
    {
        var wwwRoot = _env.WebRootPath;

        byte[] fileBytes = await System.IO.File.ReadAllBytesAsync(Path.Combine(wwwRoot + "/DataSample/", "SM_Payment_Sample.xlsx"));
        return File(fileBytes, "application/ms-excel", "SM_Payment_Sample.xlsx");

    }
    [HttpPost]
    public async Task<IActionResult> PreviewPayments(IFormFile customFile,Guid academicYearId, Guid termId, int paymentMethod, Guid debitGl, Guid creditGl)
    {
        var result = new List<PreviewPaymentDto>();
        
        var banks = await _bankRepository.GetAllListAsync();
        var students = await _studentRepository.GetAllListAsync();
        var schoolProfile = await _schoolProfileRepository.GetAllListAsync();
        var schoolProfileDto = schoolProfile.FirstOrDefault();
        ExcelEngine excelEngine = new ExcelEngine();
        IWorkbook workbook = excelEngine.Excel.Workbooks.Open(customFile.OpenReadStream());
        IWorksheet worksheet = workbook.Worksheets[0];

        DataTable excelTable = worksheet.ExportDataTable(
            worksheet.UsedRange,
            ExcelExportDataTableOptions.ColumnNames
        );

        foreach (DataRow row in excelTable.Rows)
        {
            var dto = new PreviewPaymentDto
            {
                StudentIdentifier = row["Reg No"]?.ToString(),
                StudentName = row["Student Name"]?.ToString(),
                PaymentDate = SafeParseDate(row["Transaction Date"]),
                CurrencyName = row["Currency"]?.ToString(),
                Description = row["Description"]?.ToString(),
                PaymentAmount = row["Amount"] is DBNull ? 0 : Convert.ToDecimal(row["Amount"]),
                ReferenceNumber = row["Reference No"]?.ToString(),
                BankName = row["Bank Name"]?.ToString(),
                BranchName = row["Bank Branch"]?.ToString(),
                ChequeDate = SafeParseDate(row["Cheque Date"]),
                ChequeNumber = row["Cheque No"]?.ToString(),
                
            };
            
            // Skip completely empty rows (the ones created by the large date formatting range)
            bool isCompletelyEmpty = true;
            foreach (object cellValue in row.ItemArray)
            {
                if (cellValue != null && cellValue != DBNull.Value && 
                    !string.IsNullOrWhiteSpace(cellValue.ToString().Trim()))
                {
                    isCompletelyEmpty = false;
                    break;
                }
            }
            if (isCompletelyEmpty) continue;
            // check first and last name
            if (string.IsNullOrWhiteSpace(dto.StudentName))
            {
                dto.Error = "Student Name is required";
                result.Add(dto);
                continue;
            }
            //check reg no
            if (string.IsNullOrWhiteSpace(dto.StudentIdentifier))
            {
                dto.Error = "Reg No is required";
                result.Add(dto);
                continue;
            }
            
            if (string.IsNullOrWhiteSpace(dto.Description))
            {
                dto.Error = "Description is required";
                result.Add(dto);
                continue;
            }
            
            if (string.IsNullOrWhiteSpace(dto.CurrencyName))
            {
                dto.Error = "Currency is required";
                result.Add(dto);
                continue;
            }

            var currency = await _currencyRepository
                .FirstOrDefaultAsync(x => x.CurrencyName == dto.CurrencyName);

            if (currency == null)
            {
                dto.Error = "Currency not found";
                result.Add(dto);
                continue;
            }
            var student = students.FirstOrDefault(s => s.StudentIdentifier == dto.StudentIdentifier);
            if (student == null)
            {
                dto.Error = "Student not found";
                result.Add(dto);
                continue;
            }

            if (dto.PaymentAmount <= 0)
            {
                dto.Error = "Payment amount must be greater than zero";
                result.Add(dto);
                continue;
            }
            var bank = banks.FirstOrDefault(s => s.Name == dto.BankName);
            var branch = bank?.BankBranches
                .FirstOrDefault(b => b.Name == dto.BranchName);
            // if bank and branch are not empty check them
            if (!string.IsNullOrWhiteSpace(dto.BankName) &&
                !string.IsNullOrWhiteSpace(dto.BranchName))
            {
                if (bank == null)
                {
                    dto.Error = "Bank not found";
                    result.Add(dto);
                    continue;
                }

                if (branch == null)
                {
                    dto.Error = "Bank Branch not found";
                    result.Add(dto);
                    continue;
                }
            }
            dto.StudentId = student.Id;
            dto.CurrencyId = currency.Id;
            dto.BuyRate = currency.BuyRate;
            dto.AcademicYearId = academicYearId;
            dto.TermId = termId;
            dto.ClassId = student.ClassId;
            dto.PaymentMethod = paymentMethod;
            dto.BankId = bank?.Id ?? Guid.Empty;
            dto.BankBranchId = branch?.Id ?? Guid.Empty;
            dto.DebitGlId = debitGl;
            dto.CreditGlId = creditGl;
            dto.BankGlId = debitGl;
            dto.LegalGuardianId = Guid.Empty;
            dto.AmountToPaid = dto.PaymentAmount;
            dto.AmountDue = student.BalanceDue;
            dto.ChequeDate ??= DateTime.Today;
            
            if (dto.CurrencyId != schoolProfileDto.CurrencyId)
            {
                dto.IsMultiCurrency = true;
            }

            dto.Error = null;
            result.Add(dto);
        }
        

        return Ok(result);
    }
    
    [HttpPost]
    public async Task<IActionResult> ImportPayments([FromBody] List<CreatePaymentInput> inputs)
    {
        if (inputs == null || !inputs.Any())
        {
            return Ok(new
            {
                result = new
                {
                    code = 400,
                    message = "No payment records to import"
                }
            });
        }

        foreach (var input in inputs)
        {
            await _paymentAppService.Create(input);
        }

        return Ok(new
        {
            result = new
            {
                code = 200,
                message = $"{inputs.Count} payments imported successfully"
            }
        });
    }
}


