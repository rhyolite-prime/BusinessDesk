using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ap.Reports;

public interface IApReportsAppService: Abp.Application.Services.IApplicationService
{
    Task<object> GetReportHeader(string title);
    Task<object> GetSuppliers();
    Task<object> GetSuppliersByGroup(Guid supplierGroupId);
    Task<object> GetStatement(Guid supplierId);
    
    Task<object> GetStatementType2(Guid supplierId, DateTime startDate, DateTime endDate);
    Task<object> GetStatementType3(Guid supplierId, DateTime startDate, DateTime endDate);
    Task<object> GetStatementByOu(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate);
    Task<object> GetStatementByOuType2(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate);
    Task<object> GetInvoice(Guid supplierId);
    Task<object> GetAllInvoices();
    Task<object> GetCanceledInvoices();
    Task<object> GetInvoiceByBatch(string batchNumber);
    Task<object> GetInvoiceByInvoiceNumber(string invoiceNumber);
    Task<object> GetInvoiceByDate(DateTime startDate, DateTime endDate);
    Task<object> GetInvoiceByRange(int startNumber, int endNumber);
    Task<object> GetInvoiceReport(Guid id);
    Task<object> GetInvoiceDetails(Guid id);
    Task<object> GetOpeningBalances(string status);
    Task<object> GetOpeningBalancesBySupplier(Guid supplierId, string status);
    Task<object> GetAllConvertedOpeningBalances(string status);
    
    Task<object> GetPayments();
    Task<object> GetPaymentsBySupplier(Guid supplierId);
    Task<object> GetPaymentsByDate(DateTime startDate, DateTime endDate);
    Task<object> GetPaymentReceipts(Guid id);
    Task<object> GetPaymentReceipts(List<Guid> ids);
    
    Task<object> GetVouchers();
    Task<object> GetVouchersBySupplier(Guid supplierId);
    Task<object> GetVouchersByDate(DateTime startDate, DateTime endDate);
    Task<object> GetVoucherByInvoice(string invoiceId);
    Task<object> GetVoucherDetails(Guid voucherId);
    Task<object> GetPaymentVoucher(Guid id);
    Task<object> GetPaymentVouchers(List<Guid> ids);
    Task<object> GetDebitMemo();
    
    //Ageing reports
    Task<object> GetAgingSummary(DateTime startDate, int agingInterval);
    Task<object> GetAgeingBySupplier(Guid supplierId, DateTime startDate, int agingInterval);
    Task<object> GetAgeingByDate(DateTime startDate, int agingInterval);
    
    Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency);
   
}