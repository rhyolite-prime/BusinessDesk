using System;
using System.Collections.Generic;
using TopazERP.Models.Ar;

namespace TopazERP.Services.Ar.Quotations.Dto;
public class CreateQuotationsInput
{
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; }
    public string Address { get; set; }
    public string AccountNumber { get; set; }
    public Guid CurrencyId { get; set; }
    public string CurrencyName { get; set; }
    public string CurrencyCode { get; set; }
    public decimal buyRate { get; set; }
    public string QuotationNumber { get; set; }
    public string Notes { get; set; }
    public bool SendEmail { get; set; }
    public bool SendSms { get; set; }
    public bool IsConvertedToInvoice { get; set; }
    public DateTime QuotationDate { get; set; }
    public List<QuotationDetail> Details { get; set; }
    public List<ArQuotationTaxLevies> TaxLevies { get; set; }
}