using System;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Email.Dto;

namespace TopazERP.Services.SchoolManager.Email;

public interface ISmEmailAppService: Abp.Application.Services.IApplicationService
{
    Task<TerminalReportDto> BuildTerminalReportAsync(Guid studentId, Guid classId, Guid academicYearId, Guid termId);
    Task<MidTermResultsDto> BuildMidTermResults(Guid studentId, Guid classId, Guid academicYearId, Guid termId);
    Task<BillDto> BuildStudentBill(Guid studentId, Guid academicYearId, Guid termId);
    
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
    Task<object>DispatchStudentBill(EmailBillDto dto); 
    Task<object>DispatchStudentBillSummary(EmailBillDto dto); 
    Task<byte[]> RenderStudentBillSummaryPdf(Guid studentId, Guid academicYearId, Guid termId);
    
}