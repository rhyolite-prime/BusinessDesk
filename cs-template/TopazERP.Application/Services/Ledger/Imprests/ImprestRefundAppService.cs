using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Imprests;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Imprests.Dto;

namespace TopazERP.Services.Ledger.Imprests
{
    public class ImprestRefundAppService : TopazERPAppServiceBase
    {
        private readonly IImprestRefundManager _manager;
        private readonly IMapper _mapper;

        public ImprestRefundAppService(IImprestRefundManager manager, IMapper mapper)
        {
            _manager = manager;
            _mapper = mapper;
        }

        public async Task Create(ImprestRefundDto dto)
        {
            var obj = _mapper.Map<ImprestRefund>(dto);
            await _manager.Create(obj);
        }

        public async Task Update(ImprestRefundDto dto)
        {
            var obj = _mapper.Map<ImprestRefund>(dto);
            await _manager.Update(obj);
        }

        public async Task<object> ListAll()
        {
            return await _manager.ListAll();
        }

        public async Task<object> GetEmployeeImprestRefunds(Guid id)
        {
           return await _manager.GetEmployeeImprestRefunds(id);
        }
        
        public async Task Delete(Guid id)
        {
            await _manager.Delete(id);
        }
    }
}
