using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffQualifications
{
    public interface IStaffQualificationManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffQualification staffQualification);
        Task Update(StaffQualification staffQualification);
        Task Delete(Guid id);
    }
}