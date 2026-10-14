using System.Collections.Generic;
using TopazERP.Notifications.Dto;


namespace TopazERP.DomainServices.Ar.Reports.Dto;

public class InvoiceData
{
    public string InvoiceNumber { get; set; }
    public string InvoiceDate { get; set; }
    public string ProjectedPayDate { get; set; }
    public decimal Balance { get; set; }
    public decimal TotalInvoiceAmount { get; set; }
    public string AmountInWords { get; set; }
    
    public decimal TotalBeforeDiscount { get; set; }
    public decimal TotalDiscount { get; set; }
    public string CurrencyName { get; set; }
    public string PurchaseOrderNumber { get; set; }
    public decimal VatAmount { get; set; }
    public string ReferenceNumber { get; set; }
    
    public ReportHeader ReportHeader { get; set; }
    public CustomerInfo CustomerInfo { get; set; }
    public List<ArInvoiceDetailDto> InvoiceDetails { get; set; }
  
    public SmtpCredentials SmtpCredentials { get; set; }
    
    
}

public class CustomerInfo
{
    public string CustomerName { get; set; }
    public string CustomerAddress { get; set; }
    public string CustomerPhoneNo { get; set; }
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

public class ArInvoiceDetailDto
{
    public int Index { get; set; }
    public string Description { get; set; }
    public decimal UnitPrice { get; set; }
    public string ReferenceNumber { get; set; }
    
    public decimal AmountBeforeDiscount { get; set; }
    public decimal Quantity { get; set; }
    public string Amount { get; set; }
    public decimal SubTotal { get; set; }
   
}

public class ArTaxLeviesDto
{
    public int Index { get; set; }
    public string Description { get; set; }
    public string Amount { get; set; }
    
    public decimal UnitPrice { get; set; }
    
    public decimal AmountBeforeDiscount { get; set; }
    public decimal SubTotal { get; set; }
    public decimal Quantity { get; set; }
    public string ReferenceNumber { get; set; }
   
}