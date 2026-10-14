using AutoMapper;
using TopazERP.DomainServices.Shared.CountryStates;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.CountryStates.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CountryStates
{
    public class CountryStateAppService: TopazERPAppServiceBase ,ICountryStateAppService
    {
        private readonly ICountryStateManager _countryStateManager;
        private readonly IMapper _mapper;

        public CountryStateAppService(ICountryStateManager countryStateManager, IMapper mapper)
        {
            _countryStateManager = countryStateManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _countryStateManager.ListAll();
        }

        public async Task<object> Create(CreateCountryStateInput input)
        {
            var obj = _mapper.Map<CountryState>(input);
            return await _countryStateManager.Create(obj);
        }

        public async Task Update(UpdateCountryStateInput input)
        {
            var obj = _mapper.Map<CountryState>(input);
            await _countryStateManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _countryStateManager.Delete(Id);
        }
    }
}
