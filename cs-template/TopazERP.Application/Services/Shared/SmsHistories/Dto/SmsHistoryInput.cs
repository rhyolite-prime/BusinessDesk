using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.SmsHistories.Dto
{
   public class SmsHistoryInput
    {
        public string Message { get; set; }
        public decimal Rate { get; set; }
        public string Recipient { get; set; }
        public int TenantId { get; set; }
    }
}
