using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Stock
{
   public class InventoryItemLedgerNumber
    {
        public Guid InventoryAccountId { get; set; }
        public Guid CostOfGoodSoldAccountId { get; set; }
        public Guid WriteOffAdjustmentAccountId { get; set; }
        public Guid BankAccountId { get; set; }
        public Guid SalesRevenueAccountId { get; set; }
        public Guid SalesReturnAccountId { get; set; }
        public Guid TransferAccountId { get; set; }
        public Guid CreditPurchasesAccountId { get; set; }
        public Guid CashPurchasesAccountId { get; set; }
        public Guid ExpenseAccountId { get; set; }
        public Guid PurhasesBankAccountId { get; set; }
        public Guid SalesBankAccountId { get; set; }
        public Guid CreditSalesBankAccountId { get; set; }
    }
}
