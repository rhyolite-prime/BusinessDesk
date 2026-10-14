using AutoMapper;
using TopazERP.DomainServices.Payroll.DeductionTypes;
using TopazERP.DomainServices.Payroll.DeductionTypes.Dto;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.DeductionTypes.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.DeductionTypes
{
   public class DeductionTypeAppService : TopazERPAppServiceBase, IDeductionTypeAppService
    {
        private readonly IDeductionTypeManager _deductionTypeManager;
        private readonly IMapper _mapper;

        public DeductionTypeAppService(IDeductionTypeManager deductionTypeManager, IMapper mapper)
        {
            _deductionTypeManager = deductionTypeManager;
            _mapper = mapper;
        }

        public async Task<object> ListAll()
        {
            return await _deductionTypeManager.ListAll();
        }

        public async Task<object> ListAll(Guid deductionTypeId, Guid employeeId, Guid categoryId)
        {
            return await _deductionTypeManager.ListAll(deductionTypeId, employeeId, categoryId);
        }
        public async Task<object> GetByCategory(Guid categoryId)
        {
            return await _deductionTypeManager.ListAll(categoryId);
        }

        public async Task<object> Create(CreateDeductionTypeInput input)
        {
            var obj = _mapper.Map<DeductionType>(input);
            return await _deductionTypeManager.Create(obj);
        }

        public async Task Update(UpdateDeductionTypeInput input)
        {
            var obj = _mapper.Map<DeductionType>(input);
            await _deductionTypeManager.Update(obj);
        }

        public async Task<bool> Delete(Guid Id)
        {
           return await _deductionTypeManager.Delete(Id);

        }

        public async Task<object> CreateDeductionRate(DeductionRateInput input)
        {
            return await _deductionTypeManager.CreateDeductionRate(input);
        }

        public async Task UpdateDeductionRate(DeductionRateInput input)
        {
            await _deductionTypeManager.UpdateDeductionRate(input);
        }

        public async Task DeleteDeductionRate(DeductionRateInput input)
        {
            await _deductionTypeManager.DeleteDeductionRate(input);
        }

    }
}
