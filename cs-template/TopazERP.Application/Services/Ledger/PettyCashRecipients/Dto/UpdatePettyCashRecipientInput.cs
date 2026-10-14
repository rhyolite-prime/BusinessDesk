using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.PettyCashRecipients.Dto
{
    public class UpdatePettyCashRecipientInput:EntityDto<Guid>
    {
        public string Recipient { get; set; }
        public string PhoneNo { get; set; }
        public string Email { get; set; }
        public int TenantId { get; set; }
    }
}
