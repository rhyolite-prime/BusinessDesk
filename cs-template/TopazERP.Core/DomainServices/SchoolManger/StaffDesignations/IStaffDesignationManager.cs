using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffDesignations
{
    public interface IStaffDesignationManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffDesignation staffDesignation);
        Task Update(StaffDesignation staffDesignation);
        Task Delete(Guid id);
    }
}