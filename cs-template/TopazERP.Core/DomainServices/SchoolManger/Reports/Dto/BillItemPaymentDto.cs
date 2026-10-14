using System;

namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class BillItemPaymentDto
{
    public Guid FeeItemId { get; set; }
    public string FeeItemName { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal Percentage { get; set; }

    public decimal AmountPaid { get; set; }

    public decimal Balance { get; set; }

}