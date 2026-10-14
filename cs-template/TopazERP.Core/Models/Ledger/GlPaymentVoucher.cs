using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.Win32.SafeHandles;

namespace TopazERP.Models.Ledger;

public class GlPaymentVoucher: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public string BatchNo { get; set; }
    public string BatchDescription { get; set; }
    
    public DateTime? PaymentDate { get; set; } 
    
    public Guid BankAccountId { get; set; }
    
    public string BankAccountName { get; set; }
    
    public Guid BankId { get; set; }
    public string BankName { get; set; }
    
    public string ChequeNo { get; set; }
    public DateTime VoucherEntryDate { get; set; }
    public string ModeOfPayment { get; set; }
    
    public Guid CurrencyId { get; set; }
    
    public string CurrencyName { get; set; }
    
    public string CurrencyCode { get; set; }
    
    public decimal BuyRate { get; set; }
    
    public decimal BaseAmount { get; set; }
    
    public bool HasCommunicationServiceTax { get; set; }
    
    public decimal CommunicationServiceTaxRate { get; set; }
    
    public bool HasCovidTax { get; set; }
    
    public decimal CovidTaxRate { get; set; }
    
    public bool HasWithHolding { get; set; }
    
    public bool HasGetFundLevy { get; set; }
    
    public decimal GetFundLevyRate { get; set; }
    
    public bool HasNationalHealthInsuranceLevy { get; set; }
    
    public decimal NationalHealthInsuranceLevyRate { get; set; }
    
    public bool HasVat { get; set; }
    
    public decimal VatRate { get; set; }
    public decimal TotalVatAmount { get; set; }
    public bool HasVatWithhold { get; set; }
    
    public decimal WithHoldingVatPercentage { get; set; }
    public decimal GrossAmount { get; set; } //as total on view
    public decimal TotalWithheld { get; set; }
    public decimal TotalRetained { get; set; }
    public decimal NetAmount { get; set; }
    public decimal TotalVatWithheld { get; set; }
    
    public string TaxType { get; set; }
    public Guid VatWithHoldingAccountId { get; set; }
    public string VatWithHoldingAccountName { get; set; }
    public Guid WithHoldingAccountId { get; set; }
    public string WithHoldingAccountName { get; set; }
    public decimal VatWithHoldAmount { get; set; }
    public decimal WithHoldingRate { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName{ get; set; }
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; }
    public bool Posted { get; set; }
    public bool IsPayment { get; set; }
    public bool IsMultiCurrency { get; set; }
    public bool IsPosted { get; set; }
    
    [Column(TypeName = "jsonb")] public List<GlVoucherDetail> Details { get; set; }
    
    public int TenantId { get; set; }
}