using System;

namespace TopazERP.Models.Ap;

public class InvoiceTaxLevies
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public decimal Amount { get; set; }
    public decimal Rate { get; set; }
    public bool IsApplied { get; set; }
}