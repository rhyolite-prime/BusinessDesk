using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class EmployeeRelief : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid ReliefTypeId { get; set; }
        public string ReliefTypeName { get; set; }
        public decimal Amount { get; set; }
        public int TenantId { get; set; }
    }
}
