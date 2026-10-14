using AutoMapper;
using TopazERP.DomainServices.Shared.Banks;
using TopazERP.DomainServices.Shared.Banks.Dto;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Banks.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Banks
{
    public class BankAppService: TopazERPAppServiceBase, IBankAppService
    {
        private readonly IBankManager _bankManager;
        private readonly IMapper _mapper;

        public BankAppService(IBankManager bankManager, IMapper mapper)
        {
            _bankManager = bankManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _bankManager.ListAll();
        }

        public async Task<object> Create(CreateBankInput input)
        {
            var obj = _mapper.Map<Bank>(input);
            return await _bankManager.Create(obj);
        }

        public async Task Update(UpdateBankInput input)
        {
            var obj = _mapper.Map<Bank>(input);
            await _bankManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {   
            await _bankManager.Delete(Id);
        }

        // branches...
        public async Task<object> CreateBranch(BranchInput input)
        {
            return await _bankManager.CreateBranch(input);
        }

        public async Task UpdateBranch(BranchInput input)
        {
            await _bankManager.UpdateBranch(input);
        }

        public async Task DeleteBranch(BranchInput input)
        {
            await _bankManager.DeleteBranch(input);
        }
    }
}
