using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class AllowanceType: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public int AllowanceDays { get; set; }
        public Guid ExpenseAccountId { get; set; }
        public string ExpenseAccountName { get; set; }
        public bool Taxable { get; set; }
        [Column(TypeName = "jsonb")] public List<AllowanceRate> AllowanceRates { get; set; }
        public int TenantId { get; set; }
    }
}
