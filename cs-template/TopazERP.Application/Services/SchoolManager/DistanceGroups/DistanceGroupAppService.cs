using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.DistanceGroups;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.DistanceGroups.Dto;

namespace TopazERP.Services.SchoolManager.DistanceGroups;

public class DistanceGroupAppService : TopazERPAppServiceBase, IDistanceGroupAppService
{
    private readonly IDistanceGroupManager _distanceGroupManager;
    private readonly IMapper _mapper;


    public DistanceGroupAppService(IDistanceGroupManager distanceGroupManager, IMapper mapper)
    {
        _distanceGroupManager = distanceGroupManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateDistanceGroupInput input)
    {
        var entity = _mapper.Map<DistanceGroup>(input);
        return await _distanceGroupManager.Create(entity);
    }

    public async Task Update(UpdateDistanceGroupInput input)
    {
        var entity = _mapper.Map<DistanceGroup>(input);
        await _distanceGroupManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _distanceGroupManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _distanceGroupManager.Delete(id);
    }
}