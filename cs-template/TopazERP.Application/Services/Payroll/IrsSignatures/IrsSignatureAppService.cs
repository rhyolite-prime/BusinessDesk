using AutoMapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.IrsSignatures;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.IrsSignatures.Dto;

namespace TopazERP.Services.Payroll.IrsSignatures
{
    public class IrsSignatureAppService : TopazERPAppServiceBase, IIrsSignatureAppService
    {

        private readonly IIrsSignatureManager _irsSignatureManager;
        private readonly IMapper _mapper;

        public IrsSignatureAppService(IIrsSignatureManager irsSignatureManager, IMapper mapper)
        {
            _irsSignatureManager = irsSignatureManager;
            _mapper = mapper;
        }

        public async Task Create(CreateIrsSignatureInput input)
        {
            var obj = _mapper.Map<IrsSignature>(input);
            await _irsSignatureManager.Create(obj);
        }

        public async Task<object> GetSignature()
        {
            return await _irsSignatureManager.GetSignature();
        }
    }
}
