using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ar
{
   public class ArInvoiceDetail
    {
        public Guid Id { get; set; }
        public Guid CreditAccountId { get; set; }
        public string CreditAccountName { get; set; }
        public string Description { get; set; }
        public string ReferenceNo { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Amount { get; set; }
        public decimal SubTotal { get; set; }
        public bool DiscountAsPercentage { get; set; }
        public decimal Discount { get; set; }
    }
}
