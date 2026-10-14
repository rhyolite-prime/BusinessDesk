using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Models.Shared
{
   public class CurrencyRate
    {
        public Guid Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal SellingRate { get; set; }
        public decimal BuyingRate { get; set; }
    }
}
