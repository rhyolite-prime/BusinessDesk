using System;
using System.Threading.Tasks;
using Abp.Web.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using TopazERP.DomainServices.SchoolManger.Email;
using TopazERP.DomainServices.SchoolManger.Email.Dto;
using TopazERP.DomainServices.SchoolManger.Reports.Dto;
using TopazERP.Services.SchoolManager.Assignments;
using TopazERP.Services.SchoolManager.Email;
using TopazERP.Services.SchoolManager.Reports;
using TopazERP.Services.SchoolManager.StudentPositions;

namespace TopazERP.Web.Controllers;

public class SmReportsController: TopazERPControllerBase
{
    private readonly IReportAppService _reportAppService;
    private readonly IStudentPositionAppService _studentPositionAppService;
    private readonly IWebHostEnvironment _webHostEnvironment;
    private readonly IAssignmentAppService _assignmentAppService;
    private readonly ISmEmailAppService _smEmailAppService;
    public SmReportsController(IReportAppService reportAppService, IStudentPositionAppService studentPositionAppService, IWebHostEnvironment webHostEnvironment, IAssignmentAppService assignmentAppService, ISmEmailAppService smEmailAppService)
    {
        _reportAppService = reportAppService;
        _studentPositionAppService = studentPositionAppService;
        _webHostEnvironment = webHostEnvironment;
        _assignmentAppService = assignmentAppService;
        _smEmailAppService = smEmailAppService;
    }
    
    public IActionResult StudentByPosition()
    {
        return View();
    }
    public IActionResult ClassAssignment1()
    {
        return View();
    }
    public IActionResult ClassAssignment2()
    {
        return View();
    }
    public IActionResult ClassAssignment3()
    {
        return View();
    }
    public IActionResult ClassAssignment4()
    {
        return View();
    }
    public IActionResult Exam()
    {
        return View();
    }
    public IActionResult MidTerm()
    {
        return View();
    }
    public IActionResult ClassTrip()
    {
        return View();
    }
    public IActionResult PreClassStudents()
    {
        return View();
    }
    public IActionResult PrizeAward()
    {
        return View();
    }
    public IActionResult PtaExecutive()
    {
        return View();
    }
    public IActionResult TimeTable()
    {
        return View();
    }
    public IActionResult ClassAttendance()
    {
        return View();
    }
    public IActionResult SubjectsByClass()
    {
        return View();
    }
    public IActionResult Students()
    {
        return View();
    }
    public IActionResult ContiniousAssessment()
    {
        return View();
    }
    public IActionResult ResultsBySubjects()
    {
        return View();
    }
    public IActionResult Staffs()
    {
        return View();
        
    }
    public IActionResult Alumni()
    {
        return View();
    }
    public IActionResult StudentByGuardian()
    {
        return View();
    }
    public IActionResult TerminalReport()
    {
        return View();
    }
   
    public IActionResult EmailTerminalReport()
    {
        return View();
    }
    public IActionResult MidTermResults()
    {
        return View();
    }
    public IActionResult GraphReport()
    {
        return View();
    }
    public IActionResult Transcript()
    {
        return View();
    }
    public IActionResult CanceledResults()
    {
        return View();
    }
    public IActionResult NurseryReport()
    {
        return View();
    }
    public IActionResult AnnualPerformance()
    {
        return View();
    }
    public IActionResult CumulativeAverage()
    {
        return View();
    }
    public IActionResult CumulativeGradeStream()
    {
        return View();
    }
    public IActionResult CumulativeReport()
    {
        return View();
    }
    public IActionResult GlTransactions()
    {
        return View();
    }
    public IActionResult Statements()
    {
        return View();
    }
    public IActionResult StudentBalance()
    {
        return View();
    }
    public IActionResult StudentBill()
    {
        return View();
    }
    public IActionResult ClassBills()
    {
        return View();
    }
    public IActionResult BillReconciliation()
    {
        return View();
    }
    public IActionResult PaymentReceipt()
    {
        return View();
    }
    public IActionResult Payments()
    {
        return View();
    }
    public IActionResult BillsAndPayments()
    {
        return View();
    }
    public IActionResult CreditMemo()
    {
        return View();
    }
    public IActionResult ItemizedFees()
    {
        return View();
    }
    public IActionResult BillSetUps()
    {
        return View();
    }
    public IActionResult OpeningBalance()
    {
        return View();
    }
    public IActionResult DailySummary()
    {
        return View();
    }
    public IActionResult StudentAccountStatus()
    {
        return View();
    }
    public IActionResult CanceledPayments()
    {
        return View();
    }
    public IActionResult CanceledBills()
    {
        return View();
    }
    public IActionResult AuditLogs()
    {
        return View();
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetGlTransactions(DateTime startDate, DateTime endDate, bool isMultiCurrency)
    {
        var result = await _reportAppService.GetGlTransaction(startDate, endDate, isMultiCurrency);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetReportHeader(string title)
    {
        var result = await _reportAppService.GetReportHeader(title);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetStudentPositions()
    {
        var result = await _studentPositionAppService.GetAllStudentPositions();
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllResults()
    {
        var result = await _assignmentAppService.ListAll();
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> DownloadTerminalReportPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        var pdfBytes = await _smEmailAppService.RenderTerminalReportPdf(studentId, classId, academicYearId, termId);
        return File(pdfBytes, "application/pdf", "TerminalReport.pdf");
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> DownloadTerminalReportWithAnalysisPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        var pdfBytes = await _smEmailAppService.RenderTerminalReportWithAnalysisPdf(studentId, classId, academicYearId, termId);
        return File(pdfBytes, "application/pdf", "TerminalReportWithAnalysis.pdf");
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> DownloadMidTermPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        var pdfBytes = await _smEmailAppService.RenderMidTermPdf(studentId, classId, academicYearId, termId);
        return File(pdfBytes, "application/pdf", "MidTermResults.pdf");
    }

    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> EmailTerminalReportPdf([FromBody] EmailTerminalReportDto dto)
    {
        var result = await _smEmailAppService.DispatchTerminalReport(dto);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> EmailMidTermReportPdf([FromBody] EmailMidTermDto dto)
    {
        var result = await _smEmailAppService.DispatchMidTermReport(dto);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCanceledAssignments(Guid academicYearId, Guid termId)
    {
        var result = await _reportAppService.GetCanceledAssignments(academicYearId, termId);
        return Json(result);
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetStatement(Guid studentId, DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader("For The Period " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _reportAppService.StudentStatement(studentId, startDate, endDate);

        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetMultipleStatements([FromBody] StatementRequestDto input)
    {
        var reportHeader = await _reportAppService.GetReportHeader("For The Period " + input.StartDate.ToString("dd/MM/yyyy") + " To " + input.EndDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _reportAppService.MultipleStudentStatements(input);
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetStudentBalance(Guid studentId, DateTime startDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Student Balance As At " + startDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _reportAppService.StudentBalance(studentId, startDate);

        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetClassStudentBalance(Guid classId, DateTime startDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Student Balances As At " + startDate.ToString("dd/MM/yyyy"));
        var reportDetails = await _reportAppService.ClassStudentsBalance(classId, startDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<ActionResult> GetClassBills(Guid classId, Guid academicYearId, Guid termId, int billTypeId, Guid feeItemId)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Student Bill");
        var reportDetails = await _reportAppService.GetBillByClass(classId, academicYearId, termId, billTypeId, feeItemId);
        return Json(new { reportHeader, reportDetails});
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> DownloadStudentBillPdf(Guid studentId, Guid academicYearId, Guid termId)
    {
        var pdfBytes = await _smEmailAppService.RenderStudentBillPdf(studentId, academicYearId, termId);
        return File(pdfBytes, "application/pdf", "StudentBill.pdf");
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> DownloadStudentBillSummaryPdf(Guid studentId, Guid academicYearId, Guid termId)
    {
        var pdfBytes = await _smEmailAppService.RenderStudentBillSummaryPdf(studentId, academicYearId, termId);
        return File(pdfBytes, "application/pdf", "StudentBillSummary.pdf");
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> EmailStudentBillPdf([FromBody] EmailBillDto dto)
    {
        var result = await _smEmailAppService.DispatchStudentBill(dto);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> EmailStudentBillSummaryPdf([FromBody] EmailBillDto dto)
    {
        var result = await _smEmailAppService.DispatchStudentBillSummary(dto);
        return Json(result);
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetPaymentReceipt(Guid paymentId, Guid studentId)
    {
        var reportHeader = await _reportAppService.GetReportHeader("OFFICIAL RECEIPT");
        var reportDetails = await _reportAppService.GetPaymentReceipts(paymentId, studentId);
        return Json(new { reportHeader, reportDetails});
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetAllPaymentReceipts([FromBody] PaymentReceiptRequestDto input)
    {
        var reportHeader = await _reportAppService.GetReportHeader("OFFICIAL RECEIPT");
        var reportDetails = await _reportAppService.GetPaymentReceipts(input);
        return Json(new { reportHeader, reportDetails});
    }
    
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCancelledBills(Guid academicYearId, Guid termId)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Cancelled Bills");
        var reportDetails = await _reportAppService.GetCancelledBills(academicYearId, termId);
        return Json(new { reportHeader, reportDetails});
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillsAndPayments(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Bills and Payments From " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy") + "");
        var reportDetails = await _reportAppService.GetBillsAndPayments(startDate, endDate, Guid.Empty);
        return Json(new { reportHeader, reportDetails});
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillsReconciliation(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Bills Reconciliation From " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy") + "");
        var reportDetails = await _reportAppService.BillReconciliation(startDate, endDate);
        return Json(new { reportHeader, reportDetails});
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillsReconciliationSummary(Guid academicYearId, Guid termId)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Bills Reconciliation Summary");
        var reportDetails = await _reportAppService.BillReconciliationSummary(academicYearId, termId);
        return Json(new { reportHeader, reportDetails});
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetPayments(DateTime startDate, DateTime endDate, string title)
    {
        var reportHeader = await _reportAppService.GetReportHeader(title ?? "Payments From " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy") + "");
        var reportDetails = await _reportAppService.GetPayments(startDate, endDate);
        return Json(new { reportHeader, reportDetails});
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCancelledPayments(Guid academicYearId, Guid termId)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Cancelled Payments");
        var reportDetails = await _reportAppService.GetCancelledPayment(academicYearId, termId);
        return Json(new { reportHeader, reportDetails});
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCashierDailyPayments(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Cashier Daily Payments From " + startDate.ToString("dd/MM/yyyy") + " To " + endDate.ToString("dd/MM/yyyy") + "");
        var reportDetails = await _reportAppService.GetCashierDailyPayments(startDate, endDate);
        return Json(new { reportHeader, reportDetails});
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetBillItemsPayments(Guid academicYearId, Guid termId, Guid classId, DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader($"Itemized Fees From {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _reportAppService.GetBillItemsPayments(academicYearId, termId, classId, startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetFeeSetupItems(Guid academicYearId, Guid termId, Guid classId, string title)
    {
        var reportHeader = await _reportAppService.GetReportHeader(title);
        var reportDetails = await _reportAppService.GetFeeSetupItems(academicYearId, termId, classId);

        return Json(new { reportHeader, reportDetails });
    }
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetStudentBills(Guid academicYearId, Guid termId, Guid classId, string title)
    {
        var reportHeader = await _reportAppService.GetReportHeader(title);
        var reportDetails = await _reportAppService.GetStudentBills(academicYearId, termId, classId);
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetStudentAccountStatus(Guid classId, DateTime asAtDate, string title)
    {
        var reportHeader = await _reportAppService.GetReportHeader(title);
        var reportDetails = await _reportAppService.GetStudentAccountStatus(classId, asAtDate);
        return Json(new { reportHeader, reportDetails });
    }
  
    
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetOpeningBalances(string title)
    {
        var reportHeader = await _reportAppService.GetReportHeader(title);
        var reportDetails = await _reportAppService.GetOpeningBalances();
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetOpeningBalancesSummary(string title)
    {
        var reportHeader = await _reportAppService.GetReportHeader(title);
        var reportDetails = await _reportAppService.GetClassOpeningBalances();
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCreditMemo(DateTime startDate, DateTime endDate)
    {
        var reportHeader = await _reportAppService.GetReportHeader($"Credit Memo From {startDate:dd/MM/yyyy} To {endDate:dd/MM/yyyy}");
        var reportDetails = await _reportAppService.GetCreditMemo(startDate, endDate);
        return Json(new { reportHeader, reportDetails });
    }
    [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
    public async Task<IActionResult> GetCanceledCreditMemo(Guid academicYearId, Guid termId)
    {
        var reportHeader = await _reportAppService.GetReportHeader("Canceled Credit Memos");
        var reportDetails = await _reportAppService.GetCanceledCreditMemo(academicYearId, termId);
        return Json(new { reportHeader, reportDetails });
    }
}