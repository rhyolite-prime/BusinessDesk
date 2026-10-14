using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Imprests;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Imprests.Dto;

namespace TopazERP.Services.Ledger.Imprests
{
    public class ImprestWriteoffAppService : TopazERPAppServiceBase
    {
        private readonly IImprestWriteoffManager _manager;
        private readonly IMapper _mapper;

        public ImprestWriteoffAppService(IImprestWriteoffManager manager, IMapper mapper)
        {
            _manager = manager;
            _mapper = mapper;
        }

        public async Task Create(ImprestWriteoffDto dto)
        {
            var obj = _mapper.Map<ImprestWriteoff>(dto);
            await _manager.Create(obj);
        }

        public async Task Update(ImprestWriteoffDto dto)
        {
            var obj = _mapper.Map<ImprestWriteoff>(dto);
            await _manager.Update(obj);
        }

        public async Task<object> ListAll()
        {
            return await _manager.ListAll();
        }

        public async Task<object> GetEmployeeImprestWriteOffs(Guid id)
        {
            return await _manager.GetEmployeeImprestWriteOffs(id);
        }
        
        public async Task Delete(Guid id)
        {
            await _manager.Delete(id);
        }
    }
}
