using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class JournalHistory : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string BatchNumber { get; set; }
        public DateTime BatchDate { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal TotalDebit { get; set; }
        [Column(TypeName = "jsonb")] public List<JournalDetail> JournalDetails { get; set; }

        public int TenantId { get; set; }
    }
}
