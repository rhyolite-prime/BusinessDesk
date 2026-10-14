using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffPastPositions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffPastPositions.Dto;

namespace TopazERP.Services.SchoolManager.StaffPastPositions;

public class StaffPastPositionAppService : TopazERPAppServiceBase, IStaffPastPositionAppService
{
    private readonly IStaffPastPositionManager _staffPastPositionManager;
    private readonly IMapper _mapper;
    
    public StaffPastPositionAppService(IStaffPastPositionManager staffPastPositionManager, IMapper mapper)
    {
        _staffPastPositionManager = staffPastPositionManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStaffPastPositionInput input)
    {
        var entity = _mapper.Map<StaffPastPosition>(input);
        return await _staffPastPositionManager.Create(entity);
    }

    public async Task Update(UpdateStaffPastPositionInput input)
    {
        var entity = _mapper.Map<StaffPastPosition>(input);
        await _staffPastPositionManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _staffPastPositionManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _staffPastPositionManager.Delete(id);
    }
}