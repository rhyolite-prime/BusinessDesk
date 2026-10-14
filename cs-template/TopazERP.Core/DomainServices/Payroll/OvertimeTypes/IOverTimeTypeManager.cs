using TopazERP.DomainServices.Payroll.OvertimeTypes.Dto;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.OvertimeTypes
{
   public interface IOverTimeTypeManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(OvertimeType input);
        Task Update(OvertimeType input);
        Task Delete(Guid Id);
        Task<OvertimeType> GetAsync(Guid id);
        Task DeleteOvertimeRate(OvertimeRateInput input);
        Task UpdateOvertimeRate(OvertimeRateInput input);
        Task<object> CreateOvertimeRate(OvertimeRateInput input);
    }
}
