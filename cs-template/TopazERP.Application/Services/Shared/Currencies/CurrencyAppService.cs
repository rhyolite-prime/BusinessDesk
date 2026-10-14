using AutoMapper;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Currencies.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Currencies
{
   public class CurrencyAppService: TopazERPAppServiceBase, ICurrencyAppService
    {
        private readonly ICurrencyManager _currencyManager;
        private readonly IMapper _mapper;

        public CurrencyAppService(ICurrencyManager currencyManager, IMapper mapper)
        {
            _currencyManager = currencyManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _currencyManager.ListAll();
        }

        public async Task<object> Create(CreateCurrencyInput input)
        {
            var obj = _mapper.Map<Currency>(input);
            return await _currencyManager.Create(obj);
        }

        public async Task Update(UpdateCurrencyInput input)
        {
            var obj = _mapper.Map<Currency>(input);
            await _currencyManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _currencyManager.Delete(Id);
        }
    }
}
