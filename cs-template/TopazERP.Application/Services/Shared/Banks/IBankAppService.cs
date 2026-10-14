using TopazERP.DomainServices.Shared.Banks.Dto;
using TopazERP.Services.Shared.Banks.Dto;
using TopazERP.Services.Shared.Currencies.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Banks
{
    public interface IBankAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateBankInput input);
        Task Update(UpdateBankInput input);
        Task Delete(Guid Id);

        //branches...
        Task<object> CreateBranch(BranchInput input);
        Task UpdateBranch(BranchInput input);
        Task DeleteBranch(BranchInput input);
    }
}
