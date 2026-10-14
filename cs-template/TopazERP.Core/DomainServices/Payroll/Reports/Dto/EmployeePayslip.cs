using System.Collections.Generic;
using TopazERP.Models.Payroll;

namespace TopazERP.DomainServices.Payroll.Reports.Dto;

public class EmployeePayslip
{
    public PayslipBasicInfo PayslipBasicInfo { get; set; }
    public List<MonthlyCumulativeDeduction> EmployeeDeductions { get; set; }
    public List<EmployeePayslipAllowance> EmployeeAllowances { get; set; }
    public List<MonthlyRelief> EmployeeReliefs { get; set; }
    public List<MonthlyBenefitsInKind> EmployeeBenefitsInKind { get; set; }
    public List<MonthlyLoanDeduction> EmployeeLoans { get; set; }
    public List<MonthlySalaryAdvance> EmployeeSalaryAdvance { get; set; }
    public List<MonthlyOvertime> EmployeeOvertime { get; set; }
    public List<Paymaster> Paymaster { get; set; }
    public ReportHeader ReportHeader { get; set; }
    public SmtpCredentials SmtpCredentials { get; set; }
    public string CurrentDate { get; set; }
    public decimal GrossPay { get; set; }
}


public class PayslipBasicInfo
{
    public decimal AnnualSalary { get; set; }
    public string DepartmentName { get; set; }
    public string SalaryGradeName { get; set; }
    public string EmployeeIdentifier { get; set; }
    public string EmployeeName { get; set; }
    public string EmailAddress { get; set; }
    public string AccountNumber { get; set; }
    public string SocialSecurityNo { get; set; }
    public string Currency { get; set; }
    public string BankName { get; set; }
    public string BankBranchName { get; set; }
    
}


 

public class EmployeePayslipAllowance
{
    public decimal Amount { get; set; }
    public string AllowanceTypeName { get; set; }
    public string Taxable { get; set; }
    
}


public class ReportHeader
{
    public string CompanyName { get; set; }
    public string PrimaryPhoneNo { get; set; }
    public string Address { get; set; }
    public string Email { get; set; }
    public string ReportTitle { get; set; }
    
}

public class SmtpCredentials
{
    public string PrimaryEmailAddress { get; set; }
    public string DefaultFromDisplayName { get; set; }
    public string EmailPassword { get; set; }
    public string MailHostName { get; set; }
    public int PortNumber { get; set; }
    public bool IsSSLEnabled { get; set; }
    
}
 

 



