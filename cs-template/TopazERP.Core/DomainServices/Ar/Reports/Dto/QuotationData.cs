using System.Collections.Generic;
using TopazERP.Notifications.Dto;

namespace TopazERP.DomainServices.Ar.Reports.Dto;

public class QuotationData
{
    public string QuotationNumber { get; set; }
    public string QuotationDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string AmountInWords { get; set; }
    public decimal TotalBeforeDiscount { get; set; }
    public decimal TotalDiscount { get; set; }
    public string CurrencyName { get; set; }
    public decimal VatAmount { get; set; }
    public string ReferenceNumber { get; set; }
    
    public string Notes { get; set; }
    public ReportHeader ReportHeader { get; set; }
    public CustomerInfo CustomerInfo { get; set; }
    public List<QuotationDetailDto> Details { get; set; }
    public SmtpCredentials SmtpCredentials { get; set; }
}



public class QuotationDetailDto
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
