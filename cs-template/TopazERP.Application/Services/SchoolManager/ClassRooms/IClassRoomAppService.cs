using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.ClassRooms.Dto;

namespace TopazERP.Services.SchoolManager.ClassRooms;

public interface IClassRoomAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateClassRoomInput input);
    Task Update(UpdateClassRoomInput input);
    Task Delete(Guid id);
    
}