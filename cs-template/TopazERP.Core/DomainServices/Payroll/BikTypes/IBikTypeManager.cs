using TopazERP.DomainServices.Payroll.BikTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.BikTypes
{
   public interface IBikTypeManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> ListAll(Guid bikTypeId, Guid employeeId, Guid categoryId);
        Task<object> Create(BikType input);
        Task<object> CreateBikRate(BikRateInput input);
        Task<BikType> GetAsync(string name);
        Task UpdateBikRate(BikRateInput input);
        Task DeleteBikRate(BikRateInput input);
        Task Update(BikType input);
        Task<bool> Delete(Guid Id);
    }
}
