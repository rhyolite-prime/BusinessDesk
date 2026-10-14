using TopazERP.DomainServices.Payroll.AllowanceTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.AllowanceTypes
{
   public interface IAllowanceTypeManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid categoryId);
        Task<object> ListAll(Guid allowanceTypeId, Guid employeeId, Guid categoryId);
        Task<object> Create(AllowanceType input);
        Task<AllowanceType> GetAsync(Guid id);
        Task<AllowanceType> GetAsync(string name);
        Task Update(AllowanceType input);
        Task<bool> Delete(Guid Id);

        //rates
        Task<object> CreateAllowanceRate(AllowanceRateInput input);
        Task UpdateAllowanceRate(AllowanceRateInput input);
        Task DeleteAllowanceRate(AllowanceRateInput input);
    }
}
