using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Payroll
{
   public class PayCalendar : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public int Year { get; set; }
        [Column(TypeName = "jsonb")] public List<PayCalendarDetail> PayCalendarDetails { get; set; }
        public int TenantId { get; set; }
    }
}
