using AutoMapper;
using TopazERP.DomainServices.Shared.Cities;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Cties.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Cties
{
    public class CityAppService:TopazERPAppServiceBase, ICityAppService
    {
        private readonly ICityManager _cityManager;
        private readonly IMapper _mapper;

        public CityAppService(ICityManager cityManager, IMapper mapper)
        {
            _cityManager = cityManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _cityManager.ListAll();
        }

        public async Task<object> Create(CreateCityInput input)
        {
            var obj = _mapper.Map<City>(input);
            return await _cityManager.Create(obj);
        }

        public async Task Update(UpdateCityInput input)
        {
            var obj = _mapper.Map<City>(input);
            await _cityManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _cityManager.Delete(Id);
        }
    }
}
