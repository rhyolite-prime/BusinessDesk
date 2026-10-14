using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ledger
{
   public class Imprest : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeIdentifier { get; set; }
        public string EmployeeName { get; set; }
        public Guid ImprestCategoryId { get; set; }
        public string ImprestCategoryName { get; set; }
        public decimal Amount { get; set; }
        public decimal Balance { get; set; }
        public DateTime DisbursementDate { get; set; }
        public DateTime ExpectedRetirementDate { get; set; }
        public Guid CreditAccountId { get; set; }
        public string CreditAccountName { get; set; }
        public string PaymentMethod { get; set; }
        public string ChequeNo { get; set; }
        public string ImprestNo { get; set; }
        public Guid DebitAccountId { get; set; }
        public string DebitAccountName { get; set; }
        public string ReferenceNo { get; set; }
        public string Description { get; set; }
        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public bool PostedToGL { get; set; } 
        public int TenantId { get; set; }

    }
}
