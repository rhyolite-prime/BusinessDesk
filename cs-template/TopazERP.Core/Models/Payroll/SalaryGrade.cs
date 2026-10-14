using Castle.MicroKernel.SubSystems.Conversion;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class SalaryGrade : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public int NumericalOrder { get; set; }
        [Column(TypeName = "jsonb")] public List<SalaryNotch> SalaryNotches { get; set; }
        public int TenantId { get; set; }
    }
}
