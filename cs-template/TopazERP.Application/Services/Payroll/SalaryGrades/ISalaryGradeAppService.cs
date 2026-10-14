using TopazERP.DomainServices.Payroll.SalaryGrades.Dto;
using TopazERP.Services.Payroll.SalaryGrades.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.SalaryGrades
{
   public interface ISalaryGradeAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateSalaryGradeInput input);
        Task Update(UpdateSalaryGradeInput input);
        Task<bool> Delete(Guid Id);
        Task<object> CreateSalaryNotch(SalaryNotchInput input);
        Task UpdateSalaryNotch(SalaryNotchInput input);
        Task DeleteSalaryNotch(SalaryNotchInput input);
    }
}
