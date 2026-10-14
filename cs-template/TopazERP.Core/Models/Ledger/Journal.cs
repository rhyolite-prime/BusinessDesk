using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class Journal : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        [MaxLength(20)]
        public string BatchNumber { get; set; }
        [MaxLength(20)]
        public string TransactionSource { get; set; }
        public DateTime BatchDate { get; set; }
        [MaxLength(100)]
        public string BatchDescription { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal TotalDebit { get; set; }
        public bool IsPosted { get; set; }
        public bool IsTemporary { get; set; }
        public int TenantId { get; set; }
    }
}
