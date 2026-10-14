using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Email.Dto;
using TopazERP.Models.Sch;
using TopazERP.Notifications.Dto;

namespace TopazERP.DomainServices.SchoolManger.Email;

public interface ISmEmailManager: Abp.Domain.Services.IDomainService
{
    Task<TerminalReportDto> BuildTerminalReportAsync(Guid studentId, Guid classId, Guid academicYearId, Guid termId);
    Task<MidTermResultsDto> BuildMidTermResults(Guid studentId, Guid classId, Guid academicYearId, Guid termId);
    Task<BillDto> BuildStudentBill(Guid studentId, Guid academicYearId, Guid termId);
    
    
    Task SendWithCompanyCredentials(EmailMessage email, SmtpCredentials creds);
    Task<object> DispatchTerminalReport(EmailTerminalReportDto dto);
    
    Task<object>DispatchMidTermReport(EmailMidTermDto dto);    
    
    // render terminal report pdf
    Task<byte[]> RenderTerminalReportPdf(TerminalReportDto dto);
    Task<byte[]> RenderTerminalReportWithAnalysisPdf(TerminalReportDto dto);
    
    Task<byte[]> RenderTerminalReportPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId);
    Task<byte[]> RenderTerminalReportWithAnalysisPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId);

    Task<byte[]> RenderMidTermPdf(MidTermResultsDto dto);
    
    Task<byte[]> RenderMidTermPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId);
    
    Task<byte[]> RenderStudentBillPdf(BillDto dto);
    Task<byte[]> RenderStudentBillPdf(Guid studentId, Guid academicYearId, Guid termId);
    Task<byte[]> RenderStudentBillSummaryPdf(BillDto dto);
    Task<byte[]> RenderStudentBillSummaryPdf(Guid studentId, Guid academicYearId, Guid termId);
    Task<object>DispatchStudentBill(EmailBillDto dto);
    Task<object>DispatchStudentBillSummary(EmailBillDto dto);
    //helpers
    Task<string> GetClassName(Guid classId);
    Task<string> GetTermName(Guid termId);
    Task<string> GetStreamName(Guid streamId);
    Task<string> GetAcademicYearName(Guid academicYearId);
    Task<string> GetLevelName(Guid levelId);
    
    Task<List<BillDto>> StudentBill(Guid studentId, Guid academicYearId, Guid termId);

    Task<List<BillFooterDto>> GetBillFooters(Guid studentId, Guid academicYearId, Guid termId);
}
