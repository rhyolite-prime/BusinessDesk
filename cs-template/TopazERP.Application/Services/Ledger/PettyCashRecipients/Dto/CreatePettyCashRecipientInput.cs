using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.PettyCashRecipients.Dto
{
    public class CreatePettyCashRecipientInput
    {
        public string Recipient { get; set; }
        public string PhoneNo { get; set; }
        public string Email { get; set; }
    }
}
