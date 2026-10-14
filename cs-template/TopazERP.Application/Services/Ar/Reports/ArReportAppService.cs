using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;
using TopazERP.DomainServices.Ar.Reports;

namespace TopazERP.Services.Ar.Reports;

public class ArReportAppService: TopazERPAppServiceBase, IArReportAppService
{
    private readonly IArReportManager _arReportManager;
    
     public ArReportAppService(IArReportManager arReportManager)
    {
        _arReportManager = arReportManager;
    }
    
    public async Task<object> GetReportHeader(string title)
    {
        return await  _arReportManager.GetReportHeader(title);
    }
    
    public async Task<object> GetCustomers()
    {
        return await  _arReportManager.GetCustomers();
    }
    
    
    public async Task<object> GetCustomersByGroup(Guid customerGroupId)
    {
        return await  _arReportManager.GetCustomersByGroup(customerGroupId);
    }
    
  public async Task<object> GetStatement(Guid customerId)
    {
        return await  _arReportManager.GetStatement(customerId);
    }
    
    public async Task<object> GetStatementType2(Guid customerId, DateTime startDate, DateTime endDate)
    {
        return await  _arReportManager.GetStatementType2(customerId, startDate, endDate);
    }
    
    public async Task<object> GetStatementType3(Guid customerId, DateTime startDate, DateTime endDate)
    {
        return await  _arReportManager.GetStatementType3(customerId, startDate, endDate);
    }
    
    public async Task<object> GetInvoice(Guid customerId)
    {
        return await  _arReportManager.GetInvoice(customerId);
    }
    
    public async Task<object> GetAllInvoices()
    {
        return await  _arReportManager.GetAllInvoices();
    }
    
    public async Task<object> GetCanceledInvoices()
    {
        return await  _arReportManager.GetCanceledInvoices();
    }
    
    public async Task<object> GetInvoiceByBatch(string batchNumber)
    {
        return await  _arReportManager.GetInvoiceByBatch(batchNumber);
    }
    
    public async Task<object> GetInvoiceByInvoiceNumber(string invoiceNumber)
    {
        return await  _arReportManager.GetInvoiceByInvoiceNumber(invoiceNumber);
    }
    
    public async Task<object> GetInvoiceByDate(DateTime startDate, DateTime endDate)
    {
        return await  _arReportManager.GetInvoiceByDate(startDate, endDate);
    }
    
    public async Task<object> GetInvoiceByRange(int startNumber, int endNumber)
    {
        return await  _arReportManager.GetInvoiceByRange(startNumber, endNumber);
    }
    
    public async Task<object> GetInvoiceReport(Guid id)
    {
        return await  _arReportManager.GetInvoiceReport(id);
    }
    
    public async Task<object> GetInvoiceDetails(Guid id)
    {
        return await  _arReportManager.GetInvoiceDetails(id);
    }
    public async Task<object> GetOpeningBalances(string status)
    {
        return await  _arReportManager.GetOpeningBalances(status);
    }
    
    public async Task<object> GetOpeningBalancesByCustomer(Guid customerId, string status)
    {
        return await  _arReportManager.GetOpeningBalancesByCustomer(customerId, status);
    }
    
    public async Task<object> GetAllConvertedOpeningBalances(string status)
    {
        return await  _arReportManager.GetAllConvertedOpeningBalances(status);
    }
    
    public async Task<object> GetPayments()
    {
        return await  _arReportManager.GetPayments();
    }
    
    public async Task<object> GetPaymentsByCustomer(Guid customerId)
    {
        return await  _arReportManager.GetPaymentsByCustomer(customerId);
    }
    
    public async Task<object> GetPaymentsByDate(DateTime startDate, DateTime endDate)
    {
        return await  _arReportManager.GetPaymentsByDate(startDate, endDate);
    }
    
    public async Task<object> GetPaymentReceipts(Guid id)
    {
        return await  _arReportManager.GetPaymentReceipts(id);
    }
    
    public async Task<object> GetPaymentReceipts(List<Guid> ids)
    {
        return await  _arReportManager.GetPaymentReceipts(ids);
    }


    public async Task<object> GetQuotations()
    {
        return await  _arReportManager.GetQuotations();
    }
    
    public async Task<object> GetQuotationByCustomer(Guid customerId)
    {
        return await  _arReportManager.GetQuotationByCustomer(customerId);
    }
    
    public async Task<object> GetQuotationByDate(DateTime startDate, DateTime endDate)
    {
        return await  _arReportManager.GetQuotationByDate(startDate, endDate);
    }
    
    public async Task<object> GetQuotation(Guid quotationId)
    {
        return await  _arReportManager.GetQuotation(quotationId);
    }
    
    public async Task<object> GetQuotationPdf(Guid quotationId)
    {
        return await  _arReportManager.GetQuotationPdf(quotationId);
    }
    
    public async Task<object> GetCreditMemo()
    {
        return await  _arReportManager.GetCreditMemo();
    }
    
    public async Task<object> GetAgingSummary(DateTime startDate, int agingInterval)
    {
        return await  _arReportManager.GetAgingSummary(startDate, agingInterval);
    }
    
    public async Task<object> GetAgeingByCustomer(Guid customerId, DateTime startDate, int agingInterval)
    {
        return await  _arReportManager.GetAgeingByCustomer(customerId, startDate, agingInterval);
    }
    
    public async Task<object> GetAgeingByDate(DateTime startDate, int agingInterval)
    {
        return await  _arReportManager.GetAgeingByDate(startDate, agingInterval);
    }
    
    public async Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency)
    {
        return await  _arReportManager.GetGlTransaction(startDate, endDate, isMultiCurrency);
    }
}