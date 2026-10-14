using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class MonthlyAllowanceHist : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public string EmployeeDepartment { get; set; }
        public string EmployeeCategory { get; set; }
        public Guid AllowanceTypeId { get; set; }
        public string AllowanceTypeName { get; set; }
        public decimal Amount { get; set; }
        public bool Taxable { get; set; }
        public bool SSF { get; set; }
        public bool ProvidentFund { get; set; }
        public int AllowanceDays { get; set; }
        public bool IsMonthly { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public int TenantId { get; set; }
    }
}
