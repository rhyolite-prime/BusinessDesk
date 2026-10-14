using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.PtaPositions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.PtaPositions.Dto;

namespace TopazERP.Services.SchoolManager.PtaPositions;

public class PtaPositionAppService : TopazERPAppServiceBase, IPtaPositionAppService
{
    private readonly IPtaPositionManager _ptaPositionManager;
    private readonly IMapper _mapper;

    public PtaPositionAppService(IPtaPositionManager ptaPositionManager, IMapper mapper)
    {
        _ptaPositionManager = ptaPositionManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreatePtaPositionInput input)
    {
        var entity = _mapper.Map<PtaPosition>(input);
        return await _ptaPositionManager.Create(entity);
    }

    public async Task Update(UpdatePtaPositionInput input)
    {
        var entity = _mapper.Map<PtaPosition>(input);
        await _ptaPositionManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _ptaPositionManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _ptaPositionManager.Delete(id);
    }
}