using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.TransportationLocations;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.TransportationLocations.Dto;

namespace TopazERP.Services.SchoolManager.TransportationLocations;

public class TransportationLocationAppService : TopazERPAppServiceBase, ITransportationLocationAppService
{
    private readonly ITransportationLocationManager _transportationLocationManager;
    private readonly IMapper _mapper;

    public TransportationLocationAppService(ITransportationLocationManager transportationLocationManager, IMapper mapper)
    {
        _transportationLocationManager = transportationLocationManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateTransportationLocationInput input)
    {
        var entity = _mapper.Map<TransportationLocation>(input);
        return await _transportationLocationManager.Create(entity);
    }

    public async Task Update(UpdateTransportationLocationInput input)
    {
        var entity = _mapper.Map<TransportationLocation>(input);
        await _transportationLocationManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _transportationLocationManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _transportationLocationManager.Delete(id);
    }
}