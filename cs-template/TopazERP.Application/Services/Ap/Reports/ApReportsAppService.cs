using TopazERP.DomainServices.Ap.Reports;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ap.Reports;

public class ApReportsAppService: TopazERPAppServiceBase, IApReportsAppService
{
    private readonly IApReportManager _apReportManager;
    
    public ApReportsAppService(IApReportManager apReportManager)
    {
        _apReportManager = apReportManager;
    }
    
    public async Task<object> GetReportHeader(string title)
    {
        return await  _apReportManager.GetReportHeader(title);
    }
    
    public async Task<object> GetSuppliers()
    {
        return await  _apReportManager.GetSuppliers();
    }
    
    
    public async Task<object> GetSuppliersByGroup(Guid supplierGroupId)
    {
        return await  _apReportManager.GetSuppliersByGroup(supplierGroupId);
    }
    
    public async Task<object> GetStatement(Guid supplierId)
    {
        return await  _apReportManager.GetStatement(supplierId);
    }
    
    public async Task<object> GetStatementType2(Guid supplierId, DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetStatementType2(supplierId, startDate, endDate);
    }
    
    public async Task<object> GetStatementType3(Guid supplierId, DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetStatementType3(supplierId, startDate, endDate);
    }
    
    public async Task<object> GetStatementByOu(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetStatementByOu(supplierId, ouid, startDate, endDate);
    }
    
    public async Task<object> GetStatementByOuType2(Guid supplierId, Guid ouid, DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetStatementByOuType2(supplierId, ouid, startDate, endDate);
    }
    
    public async Task<object> GetInvoice(Guid supplierId)
    {
        return await  _apReportManager.GetInvoice(supplierId);
    }
    
    public async Task<object> GetAllInvoices()
    {
        return await  _apReportManager.GetAllInvoices();
    }
    
    public async Task<object> GetCanceledInvoices()
    {
        return await  _apReportManager.GetCanceledInvoices();
    }
    
    public async Task<object> GetInvoiceByBatch(string batchNumber)
    {
        return await  _apReportManager.GetInvoiceByBatch(batchNumber);
    }
    
    public async Task<object> GetInvoiceByInvoiceNumber(string invoiceNumber)
    {
        return await  _apReportManager.GetInvoiceByInvoiceNumber(invoiceNumber);
    }
    
    public async Task<object> GetInvoiceByDate(DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetInvoiceByDate(startDate, endDate);
    }
    
    public async Task<object> GetInvoiceByRange(int startNumber, int endNumber)
    {
        return await  _apReportManager.GetInvoiceByRange(startNumber, endNumber);
    }
    
    public async Task<object> GetInvoiceReport(Guid id)
    {
        return await  _apReportManager.GetInvoiceReport(id);
    }
    
    public async Task<object> GetInvoiceDetails(Guid id)
    {
        return await  _apReportManager.GetInvoiceDetails(id);
    }
    public async Task<object> GetOpeningBalances(string status)
    {
        return await  _apReportManager.GetOpeningBalances(status);
    }
    
    public async Task<object> GetOpeningBalancesBySupplier(Guid supplierId, string status)
    {
        return await  _apReportManager.GetOpeningBalancesBySupplier(supplierId, status);
    }
    
    public async Task<object> GetAllConvertedOpeningBalances(string status)
    {
        return await  _apReportManager.GetAllConvertedOpeningBalances(status);
    }
    
    public async Task<object> GetPayments()
    {
        return await  _apReportManager.GetPayments();
    }
    
    public async Task<object> GetPaymentsBySupplier(Guid supplierId)
    {
        return await  _apReportManager.GetPaymentsBySupplier(supplierId);
    }
    
    public async Task<object> GetPaymentsByDate(DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetPaymentsByDate(startDate, endDate);
    }
    
    
    public async Task<object> GetVouchers()
    {
        return await  _apReportManager.GetVouchers();
    }
    
    public async Task<object> GetVouchersBySupplier(Guid supplierId)
    {
        return await  _apReportManager.GetVouchersBySupplier(supplierId);
    }
    
    public async Task<object> GetVouchersByDate(DateTime startDate, DateTime endDate)
    {
        return await  _apReportManager.GetVouchersByDate(startDate, endDate);
    }
    
    public async Task<object> GetVoucherByInvoice(string invoiceId)
    {
        return await  _apReportManager.GetVoucherByInvoice(invoiceId);
    }
    
    public async Task<object> GetVoucherDetails(Guid voucherId)
    {
        return await  _apReportManager.GetVoucherDetails(voucherId);
    }
    
    public async Task<object> GetAgingSummary(DateTime startDate, int agingInterval)
    {
        return await  _apReportManager.GetAgingSummary(startDate, agingInterval);
    }
    
    public async Task<object> GetAgeingBySupplier(Guid supplierId, DateTime startDate, int agingInterval)
    {
        return await  _apReportManager.GetAgeingBySupplier(supplierId, startDate, agingInterval);
    }
    
    public async Task<object> GetAgeingByDate(DateTime startDate, int agingInterval)
    {
        return await  _apReportManager.GetAgeingByDate(startDate, agingInterval);
    }
    
    
    public async Task<object> GetDebitMemo()
    {
        return await  _apReportManager.GetDebitMemo();
    }
    
    public async Task<object> GetPaymentVoucher(Guid id)
    {
        return await  _apReportManager.GetPaymentVoucher(id);
    }
    
    public async Task<object> GetPaymentVouchers(List<Guid> ids)
    {
        return await  _apReportManager.GetPaymentVouchers(ids);
    }
    
    public async Task<object> GetPaymentReceipts(Guid id)
    {
        return await  _apReportManager.GetPaymentReceipts(id);
    }
    
    public async Task<object> GetPaymentReceipts(List<Guid> ids)
    {
        return await  _apReportManager.GetPaymentReceipts(ids);
    }
    
    public async Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency)
    {
        return await  _apReportManager.GetGlTransaction(startDate, endDate, isMultiCurrency);
    }
}