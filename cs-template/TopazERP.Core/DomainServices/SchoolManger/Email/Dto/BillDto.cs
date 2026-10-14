using System;
using System.Collections.Generic;

namespace TopazERP.DomainServices.SchoolManger.Email.Dto;

public class BillDto
{
    public string CompanyLogo { get; set; }
    public string SchoolName { get; set; }
    public string Address { get; set; }
    public string PhoneNo { get; set; }
    public string Email { get; set; }
    public Guid StudentId { get; set; }
    public string RegNo { get; set; }
    public string StudentName { get; set; }
    public string ClassName { get; set; }
    public string BillNo { get; set; }
    public string Period { get; set; }
    public decimal PreviousBalance { get; set; }
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountToPay { get; set; }
    public string message { get; set; }
    public string Currency { get; set; }
    public int code { get; set; }
    public decimal AcademicUserFeeTotal { get; set; }
    public decimal SupplementaryFeeTotal { get; set; }
    public decimal BoardingFeeTotal { get; set; }
    
    public List<BillLineDto> Lines { get; set; } = new();
    public List<BillFooterDto> Footers { get; set; } = new();
}

public class BillLineDto
{
    public string Description { get; set; }
    public decimal Amount { get; set; }
}

public class BillFooterDto
{
    public Guid FooterId { get; set; }
    public string Message { get; set; }
    public int OrderNumber { get; set; }
    public bool ToSchool { get; set; }
    public bool ToClass { get; set; }
}