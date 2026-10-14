using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Redis.Dto
{
   public class PaymentRequestDto
    {
        public string PaymentGateway { get; set; }
        public string ServiceType { get; set; }
        public string AccountSource { get; set; }
        public int TenantId { get; set; }
        public string ClientReference { get; set; }
        public decimal Amount { get; set; }
        public string CallBackApiUrl { get; set; }
        public string ReturnUrl { get; set; }
    }
}
