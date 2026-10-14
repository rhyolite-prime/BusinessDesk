using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;
using TopazERP.DomainServices.SchoolManger.Reports;
using TopazERP.DomainServices.SchoolManger.Reports.Dto;

namespace TopazERP.Services.SchoolManager.Reports;

public class ReportAppService:TopazERPAppServiceBase,IReportAppService
{
    private readonly IReportManager _reportManager;

    public ReportAppService(IReportManager reportManager)
    {
        _reportManager = reportManager;
    }

    public Task<object> GetReportHeader(string title)
    {
        return _reportManager.GetReportHeader(title);
    }

    public async Task<object> GetCanceledAssignments(Guid academicYearId, Guid termId)
    {
        return await _reportManager.GetCanceledAssignments(academicYearId, termId);
    }

    public async Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency)
    {
       return  await _reportManager.GetGlTransaction(startDate, endDate, isMultiCurrency);
    }

    public async Task<object> StudentStatement(Guid studentId, DateTime startDate, DateTime endDate)
    {
        return await _reportManager.StudentStatement(studentId, startDate, endDate);
    }

    public async Task<object> StudentBalance(Guid studentId, DateTime startDate)
    {
        return await _reportManager.StudentBalance(studentId, startDate);
    }

    public async Task<object> ClassStudentsBalance(Guid classId, DateTime startDate)
    {
        return await _reportManager.ClassStudentsBalance(classId, startDate);
    }
    

    public async Task<object> GetBillFooters(Guid studentId, Guid academicYearId, Guid termId)
    {
        return await _reportManager.GetBillFooters(studentId, academicYearId, termId);
    }

    public async Task<object> GetBillByClass(Guid classId, Guid academicYearId, Guid termId, int billTypeId, Guid feeItemId)
    {
        return await _reportManager.GetBillByClass(classId, academicYearId, termId, billTypeId, feeItemId);
    }

    public async Task<object> GetPaymentReceipts(Guid paymentId, Guid studentId)
    {
        return await _reportManager.GetPaymentReceipts(paymentId, studentId);
    }

    public async Task<object> GetCancelledBills(Guid academicYearId, Guid termId)
    {
        return await _reportManager.GetCancelledBills(academicYearId, termId);
    }

    public async Task<object> GetBillsAndPayments(DateTime startDate, DateTime endDate, Guid classId)
    {
        return await _reportManager.GetBillsAndPayments(startDate, endDate, classId);
    }

    public async Task<object> BillReconciliation(DateTime startDate, DateTime endDate)
    {
        return await _reportManager.BillReconciliation(startDate, endDate);
    }

    public async Task<object> BillReconciliationSummary(Guid academicYearId, Guid termId)
    {
        return await _reportManager.BillReconciliationSummary(academicYearId, termId);
    }

    public async Task<object> GetPayments(DateTime startDate, DateTime endDate)
    {
        return await _reportManager.GetPayments(startDate, endDate);
    }

    public async Task<object> GetCancelledPayment(Guid academicYearId, Guid termId)
    {
        return await _reportManager.GetCancelledPayment(academicYearId, termId);
    }

    public async Task<object> GetCashierDailyPayments(DateTime startDate, DateTime endDate)
    {
        return await _reportManager.GetCashierDailyPayments(startDate, endDate);
    }

    public async Task<List<SchPaymentReceipt>> GetPaymentReceipts(PaymentReceiptRequestDto input)
    {
        return await _reportManager.GetPaymentReceipts(input);
    }

    public async Task<List<object>> MultipleStudentStatements(StatementRequestDto input)
    {
        return await _reportManager.MultipleStudentStatements(input);
    }

    public async Task<object> GetBillItemsPayments(Guid academicYearId, Guid termId, Guid classId, DateTime startDate,
        DateTime endDate)
    {
        return await _reportManager.GetBillItemsPayments(academicYearId, termId, classId, startDate, endDate);
    }
    public async Task<List<FeeSetupItemDto>> GetFeeSetupItems(Guid academicYearId, Guid termId, Guid classId)
    {
        return await _reportManager.GetFeeSetupItems(academicYearId, termId, classId);
    }
    public async Task<object> GetStudentBills(Guid academicYearId, Guid termId, Guid classId)
    {
        return await _reportManager.GetStudentBills(academicYearId, termId, classId);
    }
    public async Task<List<StudentDebtorDto>> GetStudentAccountStatus(Guid classId, DateTime asAtDate)
    {
        return await _reportManager.GetStudentAccountStatus(classId, asAtDate);
    }

    public async Task<object> GetOpeningBalances()
    {
        return await _reportManager.GetOpeningBalances();
    }

    public async Task<object> GetClassOpeningBalances()
    {
        return await _reportManager.GetClassOpeningBalances();
    }

    public async Task<object> GetCreditMemo(DateTime startDate, DateTime endDate)
    {
        return await _reportManager.GetCreditMemo(startDate, endDate);
    }

    public async Task<object> GetCanceledCreditMemo(Guid academicYearId, Guid termId)
    {
        return await _reportManager.GetCanceledCreditMemo(academicYearId, termId);
    }
}