using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ClassRooms;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ClassRooms.Dto;

namespace TopazERP.Services.SchoolManager.ClassRooms;

public class ClassRoomAppService: TopazERPAppServiceBase, IClassRoomAppService
{
    private readonly IClassRoomManager _classRoomManager;
    private readonly IMapper _mapper;


    public ClassRoomAppService(IClassRoomManager classRoomManager, IMapper mapper)
    {
        _classRoomManager = classRoomManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateClassRoomInput input)
    {
        var entity = _mapper.Map<ClassRoom>(input);
        return await _classRoomManager.Create(entity);
    }

    public async Task Update(UpdateClassRoomInput input)
    {
        var entity = _mapper.Map<ClassRoom>(input);
        await _classRoomManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _classRoomManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _classRoomManager.Delete(id);
    }
    
}