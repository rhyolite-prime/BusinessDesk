using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeBenefitInKinds;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeBenefitInKinds.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.DomainServices.Payroll.BikTypes;

namespace TopazERP.Services.Payroll.EmployeeBenefitInKinds
{
   public class EmployeeBenefitInKindAppService : TopazERPAppServiceBase, IEmployeeBenefitInKindAppService
    {
        private readonly IEmployeeBenefitInKindManager _employeeBenefitInKindManager;
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly IBikTypeManager _bikTypeManager;
        private readonly IMapper _mapper;

        public EmployeeBenefitInKindAppService(IEmployeeBenefitInKindManager employeeBenefitInKindManager, IMapper mapper, IEmployeeBioDataManager employeeBioDataManager, IBikTypeManager bikTypeManager)
        {
            _employeeBenefitInKindManager = employeeBenefitInKindManager;
            _mapper = mapper;
            _employeeBioDataManager = employeeBioDataManager;
            _bikTypeManager = bikTypeManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeBenefitInKindManager.ListAll();
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _employeeBenefitInKindManager.ListAll(employeeId);
        }

        public async Task Import(List<ImportEmployeeBenefitInKindInput> inputList)
        {

            foreach (var input in inputList)
            {
                var benefitsInKindType = await _bikTypeManager.GetAsync(input.BenefitInKindTypeName);

                var employee = await _employeeBioDataManager.GetAsync(input.EmployeeIdentifier);

                if (benefitsInKindType != null && employee != null)
                {
                    var createEmployeeBenefitInKindInput = new CreateEmployeeBenefitInKindInput
                    {
                        EmployeeId = employee.Id,
                        EmployeeName = input.EmployeeName,
                        BenefitInKindTypeId= benefitsInKindType.Id,
                        BenefitInKindTypeName= benefitsInKindType.Name,
                        Amount= input.Amount, 
                        EmployeeIdentifier = input.EmployeeIdentifier,
                    };

                    var obj = _mapper.Map<EmployeeBenefitInKind>(createEmployeeBenefitInKindInput);

                    await _employeeBenefitInKindManager.Create(obj);

                }

            }
        }

        public async Task<object> Create(CreateEmployeeBenefitInKindInput input)
        {
            var obj = _mapper.Map<EmployeeBenefitInKind>(input);
            return await _employeeBenefitInKindManager.Create(obj);
        }

        public async Task Update(UpdateEmployeeBenefitInKindInput input)
        {
            var obj = _mapper.Map<EmployeeBenefitInKind>(input);
            await _employeeBenefitInKindManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _employeeBenefitInKindManager.Delete(Id);
        }
    }
}
