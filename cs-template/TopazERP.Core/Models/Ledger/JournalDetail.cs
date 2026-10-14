using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class JournalDetail: Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid AccountId { get; set; }
        public Guid JournalId { get; set; }
        [MaxLength(150)]
        public string AccountName { get; set; }
        public Guid OuId { get; set; } 
        [MaxLength(150)]
        public string OuName { get; set; }
        [MaxLength(20)]
        public string ReferenceNumber { get; set; }
        [MaxLength(20)]
        public string ChequeNo { get; set; }
        [MaxLength(150)]
        public string Description { get; set; }
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }
        public DateTime TransactionDate { get; set; }
        [MaxLength(20)]
        public string TransactionSource { get; set; }
        public bool IsMultiCurrency { get; set; }
        public bool IsReconciled { get; set; }
        public bool IsOpeningBalance { get; set; }
        public bool IsConsolidated { get; set; }
        public DateTime DateConsolidated { get; set; }
        public Guid CurrencyId { get; set; }
        [MaxLength(100)]
        public string CurrencyName { get; set; }
        [MaxLength(20)]
        public string CurrencyCode { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public DateTime BatchDate { get; set; }
        public DateTime? ClosedDate { get; set; }
        public Guid PettyCashReceipientId { get; set; } //FOR PETTY CASH ONLy, otherwise set to empty Guid
        [MaxLength(20)]
        public string PettyCashReceipientName { get; set; }
        public bool IsPosted { get; set; }
        public int StandardAccountType { get; set; }
        //
        [MaxLength(20)]
        public string BatchNumber { get; set; }
       
        public int TenantId { get; set; }
    }
}
