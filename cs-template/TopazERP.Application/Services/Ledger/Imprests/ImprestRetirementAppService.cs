using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Imprests;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Imprests.Dto;

namespace TopazERP.Services.Ledger.Imprests
{
    public class ImprestRetirementAppService : TopazERPAppServiceBase
    {
        private readonly IImprestRetirementManager _manager;
        private readonly IMapper _mapper;

        public ImprestRetirementAppService(IImprestRetirementManager manager, IMapper mapper)
        {
            _manager = manager;
            _mapper = mapper;
        }

        public async Task Create(ImprestRetirementDto dto)
        {
            var obj = _mapper.Map<ImprestRetirement>(dto);
            var details = _mapper.Map<List<ImprestRetirementDetail>>(dto.Details);
            await _manager.Create(obj, details);
        }

        public async Task Update(ImprestRetirementDto dto)
        {
            var obj = _mapper.Map<ImprestRetirement>(dto);
            await _manager.Update(obj);
        }

        public async Task<object> ListAll()
        {
            return await _manager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _manager.Delete(id);
        }
        
        public async Task<object> GetEmployeeImprestRetirements(Guid id)
        {
            return await _manager.GetEmployeeImprestRetirements(id);
        }
        
    }
}
