using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaDetails.Dto
{
   public class CreateCoaDetailInput
    {
        public string AccountName { get; set; }
        public int AccountNo { get; set; }
        public string Status { get; set; }
        public Guid AccountHeaderId { get; set; }
        public string AccountHeaderName { get; set; }
        public Guid CurrencyId { get; set; }
        public string CurrencyName { get; set; }
        public string CurrencyCode { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal CurrentForeignBalance { get; set; }
    }
}
