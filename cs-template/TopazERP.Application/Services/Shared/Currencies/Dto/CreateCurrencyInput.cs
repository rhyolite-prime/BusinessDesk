using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Currencies.Dto
{
    public class CreateCurrencyInput
    {
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public string MinorName { get; set; }
        public decimal BuyRate { get; set; }
        public decimal SellRate { get; set; }
        public List<CurrencyRate> Rates { get; set; }
    }
}
