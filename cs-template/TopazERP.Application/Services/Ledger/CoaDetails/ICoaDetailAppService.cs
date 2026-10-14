using TopazERP.Services.Ledger.CoaDetails.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaDetails
{
   public interface ICoaDetailAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListActiveAccounts();
        Task<object> ListLocalAccounts();
        Task<object> Create(CreateCoaDetailInput input);
        Task<object> Update(UpdateCoaDetailInput input);
        Task Delete(Guid Id);
    }
}
