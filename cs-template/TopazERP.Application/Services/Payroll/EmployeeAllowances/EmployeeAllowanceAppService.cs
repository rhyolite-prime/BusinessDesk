using AutoMapper;
using TopazERP.DomainServices.Payroll.AllowanceTypes;
using TopazERP.DomainServices.Payroll.EmployeeAllowances;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeAllowances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeAllowances
{
   public class EmployeeAllowanceAppService: TopazERPAppServiceBase, IEmployeeAllowanceAppService
    {
        private readonly IEmployeeAllowanceManager _employeeAllowanceManager;
        private readonly IAllowanceTypeManager _allowanceTypeManager;
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly IMapper _mapper;

        public EmployeeAllowanceAppService(IEmployeeAllowanceManager employeeAllowanceManager, IMapper mapper, IEmployeeBioDataManager employeeBioDataManager, IAllowanceTypeManager allowanceTypeManager)
        {
            _employeeAllowanceManager = employeeAllowanceManager;
            _mapper = mapper;
            _employeeBioDataManager = employeeBioDataManager;
            _allowanceTypeManager = allowanceTypeManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeAllowanceManager.ListAll();
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _employeeAllowanceManager.ListAll(employeeId);
        }

        public async Task<object> Create(CreateEmployeeAllowanceInput input)
        {
            var obj = _mapper.Map<EmployeeAllowance>(input);
            return await _employeeAllowanceManager.Create(obj);
        }

        public async Task Import(List<ImportEmployeeAllowanceInput> inputList)
        {
            foreach (var input in inputList)
            {
                 
                var allowanceType = await _allowanceTypeManager.GetAsync(input.AllowanceTypeName);
                var employee = await _employeeBioDataManager.GetAsync(input.EmployeeIdentifier);

                if (allowanceType != null && employee!= null)
                {
                    var createEmployeeAllowanceInput = new CreateEmployeeAllowanceInput
                    {
                        AllowanceTypeId = allowanceType.Id,
                        AllowanceTypeName= allowanceType.Name,
                        AllowanceDays = input.AllowanceDays, 
                        Amount= input.Amount,
                        Taxable=input.Taxable,
                        EmployeeId = employee.Id,
                        EmployeeIdentifier = employee.EmployeeIdentifier, 
                        EmployeeName = string.IsNullOrEmpty(employee.OtherName) ? $"{employee.LastName} {employee.FirstName}" : $"{employee.LastName} {employee.FirstName} {employee.OtherName}", 
                        IsMonthly = true, 
                        ProvidentFund = false, 
                        SSF = false,
                    };
                
                    var obj = _mapper.Map<EmployeeAllowance>(createEmployeeAllowanceInput);

                    await _employeeAllowanceManager.Create(obj);
                }


            }
        }

        public async Task Update(UpdateEmployeeAllowanceInput input)
        {
            var obj = _mapper.Map<EmployeeAllowance>(input);
            await _employeeAllowanceManager.Update(obj);
        }

        public async Task Delete(Guid id)
        {
            await _employeeAllowanceManager.Delete(id);

        }
    }
}
