using System.Collections.Generic;
using TopazERP.DomainServices.Payroll.Reports.Dto;
using TopazERP.Models.Ap;
namespace TopazERP.DomainServices.Ap.Reports.Dto;

public class InvoiceData
{
    public string InvoiceNumber { get; set; }
    public string InvoiceDate { get; set; }
    public string ProjectedPayDate { get; set; }
    public decimal Balance { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public string AmountInWords { get; set; }
    public string CurrencyName { get; set; }
    public string PurchaseOrderNumber { get; set; }
    public decimal VatAmount { get; set; }
    public string ReferenceNumber { get; set; }
    
    public ReportHeader ReportHeader { get; set; }
    public SupplierInfo SupplierInfo { get; set; }
    public List<InvoiceDetailDto> InvoiceDetails { get; set; }
    public SmtpCredentials SmtpCredentials { get; set; }
    
    
}

public class SupplierInfo
{
    public string SupplierName { get; set; }
    public string SupplierAddress { get; set; }
    public string SupplierPhoneNo { get; set; }
    public string AccountNumber { get; set; }
    public decimal CreditLimit { get; set; }
    public string VatNumber { get; set; }
    public string ContactPerson { get; set; }
    public string Email { get; set; }
}
public class ReportHeader
{
    public string CompanyName { get; set; }
    public string PrimaryPhoneNo { get; set; }
    public string Address { get; set; }
    public string Email { get; set; }
    public string ReportTitle { get; set; }
    public string CompanyLogo { get; set; }
    
}

public class InvoiceDetailDto
{
    public int Index { get; set; }
    public string Description { get; set; }
    public string ReferenceNumber { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Quantity { get; set; }
    public decimal Amount { get; set; }
    public decimal SubTotal { get; set; }
}
