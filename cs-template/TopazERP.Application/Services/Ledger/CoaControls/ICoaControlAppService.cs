using Abp.Application.Services;
using TopazERP.Services.Ledger.CoaControls.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaControls
{
   public interface ICoaControlAppService: IApplicationService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid id);
        Task<object> Create(CreateCoaControlInput input);
        Task Update(UpdateCoaControlInput input);
        Task Delete(Guid id);
    }
}
