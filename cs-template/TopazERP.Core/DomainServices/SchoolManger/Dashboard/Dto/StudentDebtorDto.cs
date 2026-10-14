using System;

namespace TopazERP.DomainServices.SchoolManger.Dashboard.Dto;

public class StudentDebtorDto
{
    public Guid StudentId { get; set; }
    public Guid ClassId { get; set; }
    public string StudentIdentifier  { get; set; }
    public string StudentName { get; set; }
    public string StudentClass { get; set; }

    public decimal TotalBillAmount { get; set; }

    public decimal TotalPaid { get; set; }

    public decimal BalanceDue { get; set; }
    public string Type { get; set; }
}