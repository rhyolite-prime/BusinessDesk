using System;

namespace TopazERP.Models.Payroll;

public class MonthlyBonusHistory : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
{
    public Guid EmployeeId { get; set; }
    public string EmployeeIdentifier { get; set; }
    public string EmployeeName { get; set; }
    public string EmployeeDepartment { get; set; }
    public string EmployeeCategory { get; set; }
    
    public string EarningTypeName { get; set; }
    
    public Guid EarningTypeId { get; set; }
    public bool IsSpecialEarning { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal Amount { get; set; }
    public int TenantId { get; set; }
}