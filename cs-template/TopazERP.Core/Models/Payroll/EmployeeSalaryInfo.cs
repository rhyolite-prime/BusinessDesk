using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class EmployeeSalaryInfo : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public Guid EmployeeCategoryId { get; set; }
        public Guid EmployeeSalaryGradeId { get; set; }
        public Guid EmployeeSalaryNotchId { get; set; }
        
        [MaxLength(100)]
        public string EmployeeIdentifier { get; set; }
        [MaxLength(350)]
        
        public string EmployeePhoto { get; set; }
        [MaxLength(250)]
        public string EmployeeName { get; set; }
        [MaxLength(50)]
        public string SalaryType { get; set; }
        [MaxLength(50)]
        public string PayType { get; set; }
        public Guid BankId { get; set; }
        [MaxLength(150)]
        public string BankName { get; set; }
        public Guid BankBranchId { get; set; }
        [MaxLength(150)]
        public string BankBranchName { get; set; }
        public decimal DailyHours { get; set; }
        public decimal PreviousSalary { get; set; }
        public decimal MonthlySalary { get; set; }
        public Guid CurrencyId { get; set; }
        [MaxLength(50)]
        public string CurrencyName { get; set; }
        public decimal CurrentHourlyRate { get; set; }
        [MaxLength(150)]
        public string AccountNumber { get; set; }
        public bool PaysGraduatedTax { get; set; }
        
        public bool PaysWithHoldingTax { get; set; }
        public decimal WithHoldingTaxRate { get; set; }
        public decimal VacationDaysPaid { get; set; }
        public int TenantId { get; set; }
    }
}
