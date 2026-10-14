using AutoMapper;
using TopazERP.DomainServices.Payroll.EmployeeBioDatas;
using TopazERP.DomainServices.Payroll.EmployeeSnits;
using TopazERP.Models.Payroll;
using TopazERP.Services.Payroll.EmployeeSnits.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeSnits
{
   public class EmployeeSnitAppService: TopazERPAppServiceBase, IEmployeeSnitAppService
    {
        private readonly IEmployeeSnitManager _employeeSnitManager;
        private readonly IEmployeeBioDataManager _employeeBioDataManager;
        private readonly IMapper _mapper;

        public EmployeeSnitAppService(IEmployeeSnitManager employeeSnitManager, IMapper mapper, IEmployeeBioDataManager employeeBioDataManager)
        {
            _employeeSnitManager = employeeSnitManager;
            _mapper = mapper;
            _employeeBioDataManager = employeeBioDataManager;
        }

        public async Task<object> ListAll()
        {
            return await _employeeSnitManager.ListAll();
        }

        public async Task Create(CreateEmployeeSnitInput input)
        {
            var obj = _mapper.Map<EmployeeSnit>(input);
            await _employeeSnitManager.Create(obj);
        }


        public async Task Import(List<ImportEmployeeSnitInput> inputList)
        {
            foreach (var input in inputList)
            {
                var employee = await _employeeBioDataManager.GetAsync(input.EmployeeIdentifier);

                if(employee != null)
                {

                    var employeeSsnit = new CreateEmployeeSnitInput
                    {
                        EmployeeIdentifier = input.EmployeeIdentifier,
                        EmployeeName = string.IsNullOrEmpty(employee.OtherName) ? $"{employee.LastName} {employee.FirstName}" : $"{employee.LastName} {employee.FirstName} {employee.OtherName}",
                        EmployeeId = employee.Id, 
                        ProvidentFundEmployeeContribution = input.ProvidentFundEmployeeContribution, 
                        ProvidentFundEmployerContribution = input.ProvidentFundEmployerContribution, 
                        SecondProvidentFundEmployeeContribution = input.SecondProvidentFundEmployeeContribution, 
                        SecondProvidentFundEmployerContribution = input.SecondProvidentFundEmployerContribution,
                        SocialSecurityFundEmployeeContribution = input.SocialSecurityFundEmployeeContribution, 
                        SocialSecurityFundEmployerContribution = input.SocialSecurityFundEmployerContribution, 
                        SocialSecurityNo = input.SocialSecurityNo, 
                        SuperAnnuationEmployeeContribution = input.SuperAnnuationEmployeeContribution, 
                        SuperAnnuationEmployerContribution = input.SuperAnnuationEmployerContribution

                    };

                    var obj = _mapper.Map<EmployeeSnit>(employeeSsnit);

                    await _employeeSnitManager.Create(obj);
                }
            }

        }

        public async Task Update(UpdateEmployeeSnitInput input)
        {
            var obj = _mapper.Map<EmployeeSnit>(input);
            await _employeeSnitManager.Update(obj);
        }

        public async Task<object> GetAsync(Guid Id)
        {
          return await _employeeSnitManager.GetAsync(Id);
        }

        public async Task Delete(Guid Id)
        {
            await _employeeSnitManager.Delete(Id);

        }
    }
}
