using TopazERP.DomainServices.Payroll.AllowanceTypes.Dto;
using TopazERP.Services.Payroll.AllowanceTypes.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.AllowanceTypes
{
   public interface IAllowanceTypeAppService :Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> GetByCategory(Guid categoryId);
        Task<object> ListAll(Guid allowanceTypeId, Guid employeeId, Guid categoryId);
        Task<object> Create(CreateAllowanceTypeInput input);
        Task Update(UpdateAllowanceTypeInput input);
        Task<bool> Delete(Guid Id);

        //rates
        Task<object> CreateAllowanceRate(AllowanceRateInput input);
        Task UpdateAllowanceRate(AllowanceRateInput input);
        Task DeleteAllowanceRate(AllowanceRateInput input);
    }
}
