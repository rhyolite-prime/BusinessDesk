using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Actors.MessageModels;

namespace TopazERP.DomainServices.Ar.Reports;

public interface IArReportManager: Abp.Domain.Services.IDomainService
{
     Task<object> GetReportHeader(string title);
    Task<object> GetCustomers();
    Task<object> GetCustomersByGroup(Guid customerGroupId);
    Task<object> GetStatement(Guid customerId);
    Task<object> GetStatementType2(Guid customerId, DateTime startDate, DateTime endDate);
    Task<object> GetStatementType3(Guid customerId, DateTime startDate, DateTime endDate);
    Task<object> GetInvoice(Guid customerId);
    Task<object> GetInvoiceByBatch(string batchNumber);
    Task<object> GetInvoiceByInvoiceNumber(string invoiceNumber);
    Task<object> GetInvoiceByDate(DateTime startDate, DateTime endDate);
    Task<object> GetInvoiceByRange(int startNumber, int endNumber);
    Task<object> GetAllInvoices();
    Task<object> GetCanceledInvoices();
    Task<object> GetInvoiceReport(Guid id);
    Task<object> GetInvoiceDetails(Guid id);
    
    Task<object> GetOpeningBalances(string status);
    Task<object> GetOpeningBalancesByCustomer(Guid customerId, string status);
    Task<object> GetAllConvertedOpeningBalances(string status);
    

    Task<object> GetPayments();
    Task<object> GetPaymentsByCustomer(Guid customerId);
    Task<object> GetPaymentsByDate(DateTime startDate, DateTime endDate);
    Task<object> GetPaymentReceipts(Guid id);
    Task<object> GetPaymentReceipts(List<Guid> ids);
    
    
    Task<object> GetQuotations();
    Task<object> GetQuotationByCustomer(Guid customerId);
    Task<object> GetQuotationByDate(DateTime startDate, DateTime endDate);
    Task<object> GetQuotation(Guid quotationId);
    Task<object> GetQuotationPdf(Guid quotationId);
    
    Task<object> GetCreditMemo();
    
    //Ageing reports
    Task<object> GetAgingSummary(DateTime startDate, int agingInterval);
    Task<object> GetAgeingByCustomer(Guid customerId, DateTime startDate, int agingInterval);
    Task<object> GetAgeingByDate(DateTime startDate, int agingInterval);
    
    Task<object> GetGlTransaction(DateTime startDate, DateTime endDate, bool isMultiCurrency);
}