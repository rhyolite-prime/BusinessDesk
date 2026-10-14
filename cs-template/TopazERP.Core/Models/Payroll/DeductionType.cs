using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class DeductionType : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public Guid AccountId { get; set; }
        [Column(TypeName = "jsonb")] public List<DeductionRate> Rates { get; set; }
        public int TenantId { get; set; }
    }
}
