using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffRelationships
{
    public interface IStaffRelationshipManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffRelationship staffRelationship);
        Task Update(StaffRelationship staffRelationship);
        Task Delete(Guid id);
    }
}