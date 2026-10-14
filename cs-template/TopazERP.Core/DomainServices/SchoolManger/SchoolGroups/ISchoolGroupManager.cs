using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SchoolGroups;

public interface ISchoolGroupManager : Abp.Domain.Services.IDomainService
{
    // === School Group ===
    Task<IEnumerable<object>> ListAllGroups();
    Task<object> CreateGroup(SchoolGroup group);
    Task UpdateGroup(SchoolGroup group);
    Task DeleteGroup(Guid id);

    // === School Group Position ===
    Task<IEnumerable<object>> ListAllPositions();
    Task<object> CreatePosition(SchoolGroupPosition position);
    Task UpdatePosition(SchoolGroupPosition position);
    Task DeletePosition(Guid id);
}