using Castle.MicroKernel.SubSystems.Conversion;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
    public class TaxTableHistory : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Title { get; set; }
        [Column(TypeName = "jsonb")] public List<TaxTable> TaxTableList { get; set; }
        public int TenantId { get; set; }

    }
}
