using AutoMapper;
using TopazERP.DomainServices.Shared.CostCenters;
using TopazERP.DomainServices.Shared.Currencies;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.CostCenters.Dto;
using TopazERP.Services.Shared.Currencies.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CostCenters
{
    public class CostCenterAppService: TopazERPAppServiceBase, ICostCenterAppService
    {

        private readonly ICostCenterManager _costCenterManager;
        private readonly IMapper _mapper;

        public CostCenterAppService(ICostCenterManager costCenterManager, IMapper mapper)
        {
            _costCenterManager = costCenterManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _costCenterManager.ListAll();
        }

        public async Task<object> Create(CreateCostCenterInput input)
        {
            var obj = _mapper.Map<CostCenter>(input);
            return await _costCenterManager.Create(obj);
        }

        public async Task Update(UpdateCostCenterInput input)
        {
            var obj = _mapper.Map<CostCenter>(input);
            await _costCenterManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _costCenterManager.Delete(Id);
        }
    }
}
