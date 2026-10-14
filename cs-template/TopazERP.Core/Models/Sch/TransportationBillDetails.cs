using System;

namespace TopazERP.Models.Sch;

public class TransportationBillDetails
{
    public Guid Id { get; set; }
    public Guid TransportationBillId { get; set; }
    public Guid StudentId { get; set; }
    public int SchoolDays { get; set; }
    public decimal Amount { get; set; }
    public Guid CurrencyId { get; set; }
    public decimal Rate { get; set; }
    public bool IsMultiCurrency { get; set; }
}