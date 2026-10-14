using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeDeductions;
using TopazERP.Models.Payroll;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.DomainServices.Payroll.DeductionTypes;
using TopazERP.Services.Payroll.EmployeeDeductions.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeDeductions
{
   public class EmployeeDeductionAppService: TopazERPAppServiceBase, IEmployeeDeductionAppService
    {
        private readonly IEmployeeDeductionManager _employeeDeductionManager;
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly IDeductionTypeManager _deductionTypeManager;
        private readonly IMapper _mapper;

        public EmployeeDeductionAppService(IEmployeeDeductionManager employeeDeductionManager, IMapper mapper, IEmployeeBioDataManager employeeBioDataManager, IDeductionTypeManager deductionTypeManager)
        {
            _employeeDeductionManager = employeeDeductionManager;
            _mapper = mapper;
            _employeeBioDataManager = employeeBioDataManager;
            _deductionTypeManager = deductionTypeManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeDeductionManager.ListAll();
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _employeeDeductionManager.ListAll(employeeId);
        }
        public async Task<object> Create(CreateEmployeeDeductionInput input)
        {
            var obj = _mapper.Map<EmployeeDeduction>(input);
            return await _employeeDeductionManager.Create(obj);
        }

        public async Task Import(List<ImportEmployeeDeductionInput> inputList)
        {
            foreach (var input in inputList)
            {
                var deductionType = await _deductionTypeManager.GetAsync(input.DeductionTypeName);
                var employee = await _employeeBioDataManager.GetAsync(input.EmployeeIdentifier);

                if (deductionType != null && employee != null)
                {
                    var employeeDeduction = new CreateEmployeeDeductionInput
                    {
                        Amount= input.Amount,
                        DeductionTypeId = deductionType.Id, 
                        DeductionTypeName = input.DeductionTypeName,
                        EmployeeId = employee.Id, 
                        EmployeeIdentifier = employee.EmployeeIdentifier, 
                        EmployerAmount = input.EmployerAmount, 
                        EmployeeName = string.IsNullOrEmpty(employee.OtherName) ? $"{employee.LastName} {employee.FirstName}" : $"{employee.LastName} {employee.FirstName} {employee.OtherName}",

                    };

                    var obj = _mapper.Map<EmployeeDeduction>(employeeDeduction);
                    await _employeeDeductionManager.Create(obj);

                }

            }
        }
        public async Task Update(UpdateEmployeeDeductionInput input)
        {
            var obj = _mapper.Map<EmployeeDeduction>(input);
            await _employeeDeductionManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _employeeDeductionManager.Delete(Id);

        }
    }
}
