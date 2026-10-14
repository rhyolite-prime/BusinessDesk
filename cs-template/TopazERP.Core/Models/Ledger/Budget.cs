using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class Budget : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid AccountId { get; set; }
        public string AccountName { get; set; }
        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public DateTime BeginDate { get; set; }
        public DateTime EndDate { get; set; }
        [Column(TypeName = "jsonb")] public List<BudgetDetail> BudgetDetails { get; set; }
        public int TenantId { get; set; }
    }
}
