using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.SchoolGroups;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.SchoolGroups.Dto;

namespace TopazERP.Services.SchoolManager.SchoolGroups;

public class SchoolGroupAppService : TopazERPAppServiceBase, ISchoolGroupAppService
{
    private readonly ISchoolGroupManager _schoolGroupManager;
    private readonly IMapper _mapper;


    public SchoolGroupAppService(ISchoolGroupManager schoolGroupManager, IMapper mapper)
    {
        _schoolGroupManager = schoolGroupManager;
        _mapper = mapper;
    }

    // === School Groups ===
    public async Task<IEnumerable<object>> ListAllGroups()
    {
        return await _schoolGroupManager.ListAllGroups();
    }

    public async Task<object> CreateGroup(CreateSchoolGroupInput input)
    {
        var entity = _mapper.Map<SchoolGroup>(input);
        return await _schoolGroupManager.CreateGroup(entity);
    }

    public async Task UpdateGroup(UpdateSchoolGroupInput input)
    {
        var entity = _mapper.Map<SchoolGroup>(input);
        await _schoolGroupManager.UpdateGroup(entity);
    }

    public async Task DeleteGroup(Guid id)
    {
        await _schoolGroupManager.DeleteGroup(id);
    }

    // === School Group Positions ===
    public async Task<IEnumerable<object>> ListAllPositions()
    {
        return await _schoolGroupManager.ListAllPositions();
    }

    public async Task<object> CreatePosition(CreateSchoolGroupPositionInput input)
    {
        var entity = _mapper.Map<SchoolGroupPosition>(input);
        return await _schoolGroupManager.CreatePosition(entity);
    }

    public async Task UpdatePosition(UpdateSchoolGroupPositionInput input)
    {
        var entity = _mapper.Map<SchoolGroupPosition>(input);
        await _schoolGroupManager.UpdatePosition(entity);
    }

    public async Task DeletePosition(Guid id)
    {
        await _schoolGroupManager.DeletePosition(id);
    }
}