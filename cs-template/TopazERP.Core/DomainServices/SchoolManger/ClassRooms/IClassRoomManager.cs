using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassRooms;

public interface IClassRoomManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ClassRoom classRoom);
    Task Update(ClassRoom classRoom);
    Task Delete(Guid id);
}
