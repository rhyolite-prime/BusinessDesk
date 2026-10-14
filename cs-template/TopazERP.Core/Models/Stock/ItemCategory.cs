using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class ItemCategory : Abp.Domain.Entities.Auditing.FullAuditedEntity<Guid>, Abp.Domain.Entities.IMustHaveTenant
    {
        public string CategoryName { get; set; }
        public string CategoryDescription { get; set; }
        public Guid ParentId { get; set; }
        public Guid InventoryGLNoId { get; set; }
        public Guid CostOfGoodSoldGLNoId { get; set; }
        public Guid WriteOffAdjustmentGLNoId { get; set; }
        public Guid BankGLNoId { get; set; }
        public Guid SalesRevenueGLNoId { get; set; }
        public Guid SalesReturnGLNoId { get; set; }
        public Guid TransferAccountGLNoId { get; set; }
        public Guid CreditPurchasesAccountGLNoId { get; set; }
        public Guid CashPurchasesAccountGLNoId { get; set; }
        public Guid ExpenseGLNoId { get; set; }
        public Guid PurhasesBankAccountGLNoId { get; set; }
        public Guid SalesBankAccountGLNoId { get; set; }
        public Guid CreditSalesBankAccountGLNoId { get; set; }
        public int TenantId { get; set; }
    }
}
