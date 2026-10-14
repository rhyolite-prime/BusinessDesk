using System;

namespace TopazERP.DomainServices.SchoolManger.Reports.Dto;

public class StudentBillItemPaymentDto
{
    public Guid StudentId { get; set; }

    public string StudentName { get; set; }

    public string RegNo { get; set; }

    public Guid FeeItemId { get; set; }

    public string FeeItemName { get; set; }

    public decimal Amount { get; set; }

    public decimal AmountPaid { get; set; }

    public decimal Balance { get; set; }

    public decimal Percentage { get; set; }
    public string FeeType { get; set; }
}