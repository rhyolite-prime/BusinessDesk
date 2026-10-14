using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class Bank : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string Name { get; set; }
        public string ContactPerson { get; set; }
        public string ContactNo { get; set; }
        public string BankCode { get; set; }
        public string Email { get; set; }
        [Column(TypeName = "jsonb")] public List<BankBranch> BankBranches { get; set; }
        public int TenantId { get; set; }
    }
}
