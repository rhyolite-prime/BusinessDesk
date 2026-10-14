using AutoMapper;
using TopazERP.DomainServices.Ledger.CoaDetails;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.CoaDetails.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaDetails
{
   public class CoaDetailAppService: TopazERPAppServiceBase, ICoaDetailAppService
    {
        private readonly ICoaDetailManager _coaDetailManager;
        private readonly IMapper _mapper;

        public CoaDetailAppService(ICoaDetailManager coaControlManager, IMapper mapper)
        {
            _coaDetailManager = coaControlManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _coaDetailManager.ListAll();
        }

        public async Task<object> ListActiveAccounts()
        {
            return await _coaDetailManager.ListActiveAccounts();
        }
        
        public async Task<object> ListLocalAccounts()
        {
            return await _coaDetailManager.ListLocalAccounts();
        }

        public async Task<object> Create(CreateCoaDetailInput input)
        {
            var obj = _mapper.Map<CoaDetail>(input);
            return await _coaDetailManager.Create(obj);
        }

        public async Task<object> Update(UpdateCoaDetailInput input)
        {
            var obj = _mapper.Map<CoaDetail>(input);
            return await _coaDetailManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _coaDetailManager.Delete(Id);
        }
    }
}
