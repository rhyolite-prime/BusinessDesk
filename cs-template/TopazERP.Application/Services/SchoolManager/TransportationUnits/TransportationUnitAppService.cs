using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.TransportationUnits;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.TransportationUnits.Dto;

namespace TopazERP.Services.SchoolManager.TransportationUnits;

public class TransportationUnitAppService : TopazERPAppServiceBase, ITransportationUnitAppService
{
    private readonly ITransportationUnitManager _transportationUnitManager;
    private readonly IMapper _mapper;

    public TransportationUnitAppService(ITransportationUnitManager transportationUnitManager, IMapper mapper)
    {
        _transportationUnitManager = transportationUnitManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateTransportationUnitInput input)
    {
        var entity = _mapper.Map<TransportationUnit>(input);
        return await _transportationUnitManager.Create(entity);
    }

    public async Task Update(UpdateTransportationUnitInput input)
    {
        var entity = _mapper.Map<TransportationUnit>(input);
        await _transportationUnitManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _transportationUnitManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _transportationUnitManager.Delete(id);
    }
}