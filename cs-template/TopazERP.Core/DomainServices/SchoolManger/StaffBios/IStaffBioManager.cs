using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffBios
{
    public interface IStaffBioManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffBio staffBio);
        Task Update(StaffBio staffBio);
        Task Delete(Guid id);
        //get satff bio by id
        Task<StaffBio> GetById(Guid id);
    }
}