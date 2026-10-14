using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.SchoolManger.Dashboard.Dto;
using TopazERP.DomainServices.SchoolManger.Reports.Dto;

namespace TopazERP.DomainServices.SchoolManger.Reports;

public interface IReportManager:IDomainService
{
    Task<object> GetReportHeader(string title);
    
    //get cancelled assignemnts
    Task<object> GetCanceledAssignments(Guid academicYearId, Guid termId);
    Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency);
    Task<object> StudentStatement(Guid studentId, DateTime startDate, DateTime endDate);

    Task<List<object>> MultipleStudentStatements(StatementRequestDto input);
    Task<object> StudentBalance(Guid studentId, DateTime startDate);
    Task<object> ClassStudentsBalance(Guid classId, DateTime startDate);
    Task<object> GetBillFooters(Guid studentId, Guid academicYearId, Guid termId);
    Task<object> GetBillByClass(Guid classId, Guid academicYearId, Guid termId, int billTypeId, Guid feeItemId );
    Task<object> GetPaymentReceipts(Guid paymentId, Guid studentId);
    Task<List<SchPaymentReceipt>> GetPaymentReceipts(PaymentReceiptRequestDto input);
    Task<object> GetCancelledBills(Guid academicYearId, Guid termId);
    Task<object> GetBillsAndPayments(DateTime startDate, DateTime endDate, Guid classId);
    Task<object> BillReconciliation(DateTime startDate, DateTime endDate);
    Task<object> BillReconciliationSummary(Guid academicYearId, Guid termId);
    Task<object> GetPayments(DateTime startDate, DateTime endDate);
    Task<object> GetCancelledPayment(Guid academicYearId, Guid termId);
    Task<object> GetCashierDailyPayments(DateTime startDate, DateTime endDate);
    Task<object> GetBillItemsPayments(Guid academicYearId, Guid termId, Guid classId, DateTime startDate, DateTime endDate);
    Task<List<FeeSetupItemDto>> GetFeeSetupItems(Guid academicYearId, Guid termId, Guid classId);
    Task<object> GetStudentBills(Guid academicYearId, Guid termId, Guid classId);
    Task<List<StudentDebtorDto>> GetStudentAccountStatus(Guid classId, DateTime asAtDate);
    Task<object> GetOpeningBalances();
    Task<object> GetClassOpeningBalances();
    Task<object> GetCreditMemo(DateTime startDate, DateTime endDate);
    Task<object> GetCanceledCreditMemo(Guid academicYearId, Guid termId);
}