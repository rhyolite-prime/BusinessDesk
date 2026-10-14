using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffPastEmployments
{
    public interface IStaffPastEmploymentManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffPastEmployment staffPastEmployment);
        Task Update(StaffPastEmployment staffPastEmployment);
        Task Delete(Guid id);
    }
}