using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Locations;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Locations.Dto;

namespace TopazERP.Services.SchoolManager.Locations;

public class LocationAppService : TopazERPAppServiceBase, ILocationAppService
{
    private readonly ILocationManager _locationManager;
    private readonly IMapper _mapper;


    public LocationAppService(ILocationManager locationManager, IMapper mapper)
    {
        _locationManager = locationManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateLocationInput input)
    {
        var entity = _mapper.Map<Location>(input);
        return await _locationManager.Create(entity);
    }

    public async Task Update(UpdateLocationInput input)
    {
        var entity = _mapper.Map<Location>(input);
        await _locationManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _locationManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _locationManager.Delete(id);
    }
}