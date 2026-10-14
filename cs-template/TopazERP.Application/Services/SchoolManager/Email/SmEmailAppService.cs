using System;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Email;
using TopazERP.DomainServices.SchoolManger.Email.Dto;

namespace TopazERP.Services.SchoolManager.Email;

public class SmEmailAppService:TopazERPAppServiceBase, ISmEmailAppService
{
    private readonly ISmEmailManager _emailManager;

    public SmEmailAppService(ISmEmailManager emailManager)
    {
        _emailManager = emailManager;
    }

    public async Task<TerminalReportDto> BuildTerminalReportAsync(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.BuildTerminalReportAsync(studentId, classId, academicYearId, termId);
    }
    public async Task<MidTermResultsDto> BuildMidTermResults(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.BuildMidTermResults(studentId, classId, academicYearId, termId);
    }

    public async Task<byte[]> RenderTerminalReportPdf(TerminalReportDto dto)
    {
       return await _emailManager.RenderTerminalReportPdf(dto);
    }
    public async Task<byte[]> RenderTerminalReportWithAnalysisPdf(TerminalReportDto dto)
    {
        return await _emailManager.RenderTerminalReportWithAnalysisPdf(dto);
    }
    public async Task<byte[]> RenderTerminalReportPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.RenderTerminalReportPdf(studentId, classId, academicYearId, termId);
    }
    public async Task<byte[]> RenderTerminalReportWithAnalysisPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.RenderTerminalReportWithAnalysisPdf(studentId, classId, academicYearId, termId);
    }
    
    public async Task<byte[]> RenderMidTermPdf(MidTermResultsDto dto)
    {
        return await _emailManager.RenderMidTermPdf(dto);
    }
    public async Task<byte[]> RenderMidTermPdf(Guid studentId, Guid classId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.RenderMidTermPdf(studentId, classId, academicYearId, termId);
    }

    public async Task<object> DispatchTerminalReport(EmailTerminalReportDto dto)
    {
        return await _emailManager.DispatchTerminalReport(dto);
    }
    public async Task<object> DispatchMidTermReport(EmailMidTermDto dto)
    {
        return await _emailManager.DispatchMidTermReport(dto);
    }

    public async Task<BillDto> BuildStudentBill(Guid studentId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.BuildStudentBill(studentId, academicYearId, termId);
    }

    public async Task<byte[]> RenderStudentBillPdf(BillDto dto)
    {
        return await _emailManager.RenderStudentBillPdf(dto);
    }
    public async Task<byte[]> RenderStudentBillPdf(Guid studentId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.RenderStudentBillPdf(studentId, academicYearId, termId);

    }
    public async Task<object> DispatchStudentBill(EmailBillDto dto)
    {
        return await _emailManager.DispatchStudentBill(dto);
    }
    public async Task<byte[]> RenderStudentBillSummaryPdf(Guid studentId, Guid academicYearId, Guid termId)
    {
        return await _emailManager.RenderStudentBillSummaryPdf(studentId, academicYearId, termId);
    }
    
    public async Task<object> DispatchStudentBillSummary(EmailBillDto dto)
    {
        return await _emailManager.DispatchStudentBillSummary(dto);
    }
}