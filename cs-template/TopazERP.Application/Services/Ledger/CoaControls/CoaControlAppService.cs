using AutoMapper;
using TopazERP.DomainServices.Ledger.CoaControls;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.CoaControls.Dto;
using System;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaControls
{
   public class CoaControlAppService: TopazERPAppServiceBase, ICoaControlAppService
    {
        private readonly ICoaControlManager _coaControlManager;
        private readonly IMapper _mapper;

        public CoaControlAppService(ICoaControlManager coaControlManager, IMapper mapper)
        {
            _coaControlManager = coaControlManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _coaControlManager.ListAll();
        }


        public async Task<object> ListAll(Guid id)
        {
            return await _coaControlManager.ListAll(id);
        }
        public async Task<object> Create(CreateCoaControlInput input)
        {
            var obj = _mapper.Map<CoaControl>(input);
            return await _coaControlManager.Create(obj);
        }

        public async Task Update(UpdateCoaControlInput input)
        {
            var obj = _mapper.Map<CoaControl>(input);
            await _coaControlManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _coaControlManager.Delete(Id);
        }
    }
}
