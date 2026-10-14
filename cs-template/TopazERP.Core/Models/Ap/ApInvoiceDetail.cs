using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Shared;

namespace TopazERP.Models.Ap
{
   public class ApInvoiceDetail
    {
        public Guid Id { get; set; }
        
        public string ReferenceNumber { get; set; }
        public string Description { get; set; }
        public int Quantity { get; set; }
        public decimal Amount { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubTotal { get; set; }
        public bool DiscountAsPercentage { get; set; }
        public decimal Discount { get; set; }
        public Guid DebitAccountId { get; set; }
        public string DebitAccountName { get; set; }
       
       
    }
}
