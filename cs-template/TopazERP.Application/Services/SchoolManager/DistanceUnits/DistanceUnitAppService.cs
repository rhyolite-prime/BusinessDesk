using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.DistanceUnits;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.DistanceUnits.Dto;

namespace TopazERP.Services.SchoolManager.DistanceUnits;

public class DistanceUnitAppService: TopazERPAppServiceBase, IDistanceUnitAppService
{
    private readonly IDistanceUnitManager _distanceUnitManager;
    private readonly IMapper _mapper;


    public DistanceUnitAppService(IDistanceUnitManager distanceUnitManager, IMapper mapper)
    {
        _distanceUnitManager = distanceUnitManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateDistanceUnitInput input)
    {
        var entity = _mapper.Map<DistanceUnit>(input);
        return await _distanceUnitManager.Create(entity);
    }

    public async Task Update(UpdateDistanceUnitInput input)
    {
        var entity = _mapper.Map<DistanceUnit>(input);
        await _distanceUnitManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _distanceUnitManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _distanceUnitManager.Delete(id);
    }   
    
}