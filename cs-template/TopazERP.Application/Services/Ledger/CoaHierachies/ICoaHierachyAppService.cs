using TopazERP.Services.Ledger.CoaHierachies.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaHierachies
{
   public interface ICoaHierachyAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateCoaHierachyInput input);
        Task Update(UpdateCoaHierachyInput input);
        Task Delete(Guid Id);
    }
}
