using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeSalaryInfos.Dto
{
   public class UpdateEmployeeSalaryInfoInput: EntityDto<Guid>
    {
        public Guid EmployeeId { get; set; }
        public Guid EmployeeCategoryId { get; set; }
        public Guid EmployeeSalaryGradeId { get; set; }
        public Guid EmployeeSalaryNotchId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeePhoto { get; set; }
        public string EmployeeName { get; set; }
        public string SalaryType { get; set; }
        public string PayType { get; set; }
        public Guid BankId { get; set; }
        public Guid BankBranchId { get; set; }
        public decimal DailyHours { get; set; }
        public decimal PreviousSalary { get; set; }
        public decimal MonthlySalary { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public decimal CurrentHourlyRate { get; set; }
        public string AccountNumber { get; set; }
        public decimal VacationDaysPaid { get; set; }
        public bool PaysGraduatedTax { get; set; }
        public bool PaysWithHoldingTax { get; set; }
        public decimal WithHoldingTaxRate { get; set; }
        public int TenantId { get; set; }
    }
}
