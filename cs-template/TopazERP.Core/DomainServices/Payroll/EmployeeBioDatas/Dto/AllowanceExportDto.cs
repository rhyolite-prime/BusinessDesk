using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeBioDatas.Dto
{
    public class AllowanceExportDto
    {
        [DisplayNameAttribute("Employee ID")]
        public string EmployeeIdentifier { get; set; }

        [DisplayNameAttribute("Allowance Days")]
        public int AllowanceDays { get; set; }

        [DisplayNameAttribute("Employee Name")]
        public string EmployeeName { get; set; }

        [DisplayNameAttribute("Allowance Type")]
        public string AllowanceType { get; set; }

        [DisplayNameAttribute("Is Taxable")]
        public string IsTaxable { get; set; }
        public decimal Amount { get; set; }

    }

    public class SalaryInfoDto
    {
        [DisplayNameAttribute("Employee ID")]
        public string EmployeeIdentifier { get; set; }
         
        [DisplayNameAttribute("Employee Name")]
        public string EmployeeName { get; set; }

        [DisplayNameAttribute("Salary Type")]
        public string SalaryType { get; set; }

        [DisplayNameAttribute("Pay Type")]
        public string PayType { get; set; }

        [DisplayNameAttribute("Monthly Salary")]
        public decimal MonthlySalary { get; set; }

        [DisplayNameAttribute("Account Number")]
        public string AccountNumber { get; set; }

        [DisplayNameAttribute("Bank Name")]
        public string BankName { get; set; }

        [DisplayNameAttribute("Currency")]
        public string Currency { get; set; }


        [DisplayNameAttribute("Bank Branch")]
        public string BankBranch { get; set; }

        [DisplayNameAttribute("Previous Salary")]
        public decimal PreviousSalary { get; set; }

        [DisplayNameAttribute("Current Hourly Rate")]
        public decimal CurrentHourlyRate { get; set; }


        [DisplayNameAttribute("Daily Hours")]
        public int DailyHours { get; set; }


        [DisplayNameAttribute("Vacation Days Paid")]
        public int VacationDaysPaid { get; set; }


        [DisplayNameAttribute("Salary Grade")]
        public string SalaryGrade { get; set; }

        [DisplayNameAttribute("Salary Notch")]
        public string SalaryNotch { get; set; }

    }

    public class SsnitExportDto
    {
        [DisplayNameAttribute("Employee ID")]
        public string EmployeeIdentifier { get; set; }

        [DisplayNameAttribute("Employee Name")]
        public string EmployeeName { get; set; }

        [DisplayNameAttribute("Social Security No")]
        public string SocialSecurityNo { get; set; }

        [DisplayNameAttribute("SSF Employee Contribution (%)")]
        public decimal SocialSecurityFundEmployeeContribution { get; set; }

        [DisplayNameAttribute("SSF Employer Contribution (%)")]
        public decimal SocialSecurityFundEmployerContribution { get; set; }

        [DisplayNameAttribute("PF Employee Contribution (%)")]
        public decimal ProvidentFundEmployeeContribution { get; set; }

        [DisplayNameAttribute("PF Employer Contribution (%)")]
        public decimal ProvidentFundEmployerContribution { get; set; }

        [DisplayNameAttribute("2nd PF Employee Contribution (%)")]
        public decimal SecondProvidentFundEmployeeContribution { get; set; }

        [DisplayNameAttribute("2nd PF Employer Contribution (%)")]
        public decimal SecondProvidentFundEmployerContribution { get; set; }

        [DisplayNameAttribute("Super Annuation Employee Contribution")]
        public decimal SuperAnnuationEmployeeContribution { get; set; }

        [DisplayNameAttribute("Super Annuation Employer Contribution")]
        public decimal SuperAnnuationEmployerContribution { get; set; }

    }

    public class DeductionsExportDto
    {
        [DisplayNameAttribute("Employee ID")]
        public string EmployeeIdentifier { get; set; }

        [DisplayNameAttribute("Employee Name")]
        public string EmployeeName { get; set; }

        [DisplayNameAttribute("Deduction Type")]
        public string DeductionType { get; set; }

        [DisplayNameAttribute("Employer Amount")]
        public decimal EmployerAmount { get; set; }
        public decimal Amount { get; set; }
         
    }

    public class BenefitsExportDto
    {
        [DisplayNameAttribute("Staff No.")]
        public string EmployeeIdentifier { get; set; }

        [DisplayNameAttribute("Name")]
        public string EmployeeName { get; set; }

        [DisplayNameAttribute("Benefit In Kind Type")]
        public string BenefitsInKindTypeName { get; set; }

        [DisplayNameAttribute("Amount")]
        public decimal Amount { get; set; }

    }

    public class EmployeeLoansExportDto
    {
        [DisplayNameAttribute("Staff No.")]
        public string EmployeeIdentifier { get; set; }
         
        [DisplayNameAttribute("Amount")]
        public decimal Amount { get; set; }

        [DisplayNameAttribute("LoanDate")]
        public string LoanDate { get; set; }

        [DisplayNameAttribute("Loan type")]
        public string LoanType { get; set; }

        [DisplayNameAttribute("Loan duration")]
        public int LoanDuration { get; set; }

        [DisplayNameAttribute("Next duration")]
        public int NextDeduction { get; set; }

        [DisplayNameAttribute("Interest rate")]
        public decimal InterestRate { get; set; }

        [DisplayNameAttribute("Interest type")]
        public string InterestType { get; set; }
    }

}
