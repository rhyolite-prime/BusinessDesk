using TopazERP.DomainServices.Payroll.DeductionTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.DeductionTypes
{
   public interface IDeductionTypeManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid categoryId);
        Task<DeductionType> GetAsync(string name);
        Task<object> ListAll(Guid deductionTypeId, Guid employeeId, Guid categoryId);
        Task<object> Create(DeductionType input);
        Task Update(DeductionType input);
        Task<bool> Delete(Guid Id);

        //
        Task DeleteDeductionRate(DeductionRateInput input);
        Task UpdateDeductionRate(DeductionRateInput input);
        Task<object> CreateDeductionRate(DeductionRateInput input);

    }
}
