using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Ar
{
   public class ArPaymentDetail
    {
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public decimal CreditAmount { get; set; }
        public Guid OuId { get; set; }
        public string OuName { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
    }
}
