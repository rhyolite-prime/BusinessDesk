using TopazERP.Services.Ledger.PettyCashRecipients.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.PettyCashRecipients
{
    public interface IPettyCashRecipientAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreatePettyCashRecipientInput input);
        Task Update(UpdatePettyCashRecipientInput input);
        Task Delete(Guid Id);
    }
}
