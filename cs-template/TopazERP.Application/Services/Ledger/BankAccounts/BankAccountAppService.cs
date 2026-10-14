using AutoMapper;
using TopazERP.DomainServices.Ledger.BankAccounts;
using TopazERP.DomainServices.Ledger.ImprestCategories;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.BankAccounts.Dto;
using TopazERP.Services.Ledger.ImprestCategories.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.BankAccounts
{
    public class BankAccountAppService: TopazERPAppServiceBase, IBankAccountAppService
    {

        private readonly IBankAccountManager _bankAccountManager;
        private readonly IMapper _mapper;

        public BankAccountAppService(IBankAccountManager bankAccountManager, IMapper mapper)
        {
            _bankAccountManager = bankAccountManager;
            _mapper = mapper;
        }


        public async Task<object> Create(CreateBankAccountInput input)
        {
            var obj = _mapper.Map<BankAccount>(input);
            return await _bankAccountManager.Create(obj);
        }

        public async Task Update(UpdateBankAccountInput input)
        {
            var obj = _mapper.Map<BankAccount>(input);
            await _bankAccountManager.Update(obj);
        }

        public async Task<object> ListAll()
        {
            return await _bankAccountManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _bankAccountManager.Delete(id);
        }
    }
}
