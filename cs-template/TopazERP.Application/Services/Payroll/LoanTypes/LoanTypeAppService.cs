using AutoMapper;
using TopazERP.DomainServices.Payroll.LoanTypes;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.LoanTypes.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.LoanTypes
{
   public class LoanTypeAppService : TopazERPAppServiceBase, ILoanTypeAppService
    {
        private readonly ILoanTypeManager _loanTypeManager;
        private readonly IMapper _mapper;

        public LoanTypeAppService(ILoanTypeManager loanTypeManager, IMapper mapper)
        {
            _loanTypeManager = loanTypeManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _loanTypeManager.ListAll();
        }

        public async Task<object> Create(CreateLoanTypeInput input)
        {
            var obj = _mapper.Map<LoanType>(input);
            return await _loanTypeManager.Create(obj);
        }

        public async Task Update(UpdateLoanTypeInput input)
        {
            var obj = _mapper.Map<LoanType>(input);
            await _loanTypeManager.Update(obj);
        }

        public async Task<bool> Delete(Guid Id)
        {
           return await _loanTypeManager.Delete(Id);
        }
    }
}
