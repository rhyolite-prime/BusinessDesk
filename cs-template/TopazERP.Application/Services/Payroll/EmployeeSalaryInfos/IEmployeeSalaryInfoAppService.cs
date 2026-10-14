using TopazERP.DomainServices.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.Services.Payroll.EmployeeSalaryInfos.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeSalaryInfos
{
   public interface IEmployeeSalaryInfoAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> GetAsync(Guid employeeId);
        Task<object> GetAllBySalaryType(string salaryType);
        Task<object> GetAllBySalaryType(string salaryType, Guid categoryId);
        Task<object> GetAllBySalaryGrade(string salaryType, Guid salaryGradeId, Guid salaryNotchId);
        Task ProcessSalaryIncrement(List<SalaryIncrement> salaryDataList);
        Task Import(List<ImportEmployeeSalaryInfoInput> inputList);
        Task Create(CreateEmployeeSalaryInfoInput input);
        Task Update(UpdateEmployeeSalaryInfoInput input);
        Task Delete(Guid id);
        Task Restore(EmployeeSalaryDataRestoreDto dto);
    }
}
