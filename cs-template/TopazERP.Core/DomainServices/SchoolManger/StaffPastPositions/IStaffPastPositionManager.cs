using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffPastPositions
{
    public interface IStaffPastPositionManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffPastPosition staffPastPosition);
        Task Update(StaffPastPosition staffPastPosition);
        Task Delete(Guid id);
    }
}