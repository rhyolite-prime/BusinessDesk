using AutoMapper;
using TopazERP.DomainServices.Payroll.OvertimeTypes;
using TopazERP.DomainServices.Payroll.OvertimeTypes.Dto;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.OvertimeTypes.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.OvertimeTypes
{
   public class OvertimeTypeAppService: TopazERPAppServiceBase, IOvertimeTypeAppService
    {
        private readonly IOverTimeTypeManager _overTimeTypeManager;
        private readonly IMapper _mapper;

        public OvertimeTypeAppService(IOverTimeTypeManager overTimeTypeManager, IMapper mapper)
        {
            _overTimeTypeManager = overTimeTypeManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _overTimeTypeManager.ListAll();
        }

        public async Task<object> Create(CreateOvertimeTypeInput input)
        {
            var obj = _mapper.Map<OvertimeType>(input);
            return await _overTimeTypeManager.Create(obj);
        }

       
        public async Task<object> CreateOvertimeRate(OvertimeRateInput input)
        {
            return await _overTimeTypeManager.CreateOvertimeRate(input);
        }

        public async Task Update(UpdateOvertimeTypeInput input)
        {
            var obj = _mapper.Map<OvertimeType>(input);
            await _overTimeTypeManager.Update(obj);
        }

        public async Task UpdateOvertimeRate(OvertimeRateInput input)
        {
            await _overTimeTypeManager.UpdateOvertimeRate(input);
        }
        public async Task Delete(Guid Id)
        {
            await _overTimeTypeManager.Delete(Id);
        }

        public async Task DeleteOvertimeRate(OvertimeRateInput input)
        {
            await _overTimeTypeManager.DeleteOvertimeRate(input);
        }
    }
}
