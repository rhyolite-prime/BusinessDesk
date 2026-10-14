using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class Biometric : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public int TenantId { get; set; }
        public string BiometricId { get; set; }
        public string StudentIdentifier { get; set; }
        public string StaffIdentifier { get; set; }
    }
}
