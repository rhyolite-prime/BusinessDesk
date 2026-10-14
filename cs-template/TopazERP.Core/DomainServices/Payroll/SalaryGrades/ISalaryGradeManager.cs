using TopazERP.DomainServices.Payroll.SalaryGrades.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.SalaryGrades
{
   public interface ISalaryGradeManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(SalaryGrade input);
        Task<SalaryGrade> GetAsync(string name);
        Task Update(SalaryGrade input);
        Task<bool> Delete(Guid Id);
        Task<object> CreateSalaryNotch(SalaryNotchInput input);
        Task UpdateSalaryNotch(SalaryNotchInput input);
        Task DeleteSalaryNotch(SalaryNotchInput input);
    }
}
