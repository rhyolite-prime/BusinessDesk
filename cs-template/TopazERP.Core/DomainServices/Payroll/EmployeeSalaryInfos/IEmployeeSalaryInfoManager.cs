using TopazERP.DomainServices.Payroll.EmployeeSalaryInfos.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeSalaryInfos
{
   public interface IEmployeeSalaryInfoManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> GetAsync(Guid employeeId);
        Task<object> GetAllBySalaryType(string salaryType);
        Task<object> GetAllBySalaryType(string salaryType, Guid categoryId);
        Task<object> GetAllBySalaryGrade(string salaryType, Guid salaryGradeId, Guid salaryNotchId);
        Task ProcessSalaryIncrement(List<SalaryIncrement> salaryDataList);
        Task Create(EmployeeSalaryInfo input);
        Task Update(EmployeeSalaryInfo input);
        Task Delete(Guid id);
        Task Restore(List<EmployeeSalaryInfo> salaryDataList, int tenantId);
    }
}
