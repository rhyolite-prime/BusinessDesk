using System;
namespace TopazERP.DomainServices.Ap.ApVouchers.Dto;

public class ApVoucherDetailsInput
{
    public Guid Id { get; set; }
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public bool IsWithHolding { get; set; }
}