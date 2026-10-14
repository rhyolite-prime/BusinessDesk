using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ActualLevels;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ActualLevels.Dto;

namespace TopazERP.Services.SchoolManager.ActualLevels;

public class ActualLevelAppService: TopazERPAppServiceBase, IActualLevelAppService
{
    private readonly IActualLevelManager _actualLevelManager;
    private readonly IMapper _mapper;

    public ActualLevelAppService(IActualLevelManager actualLevelManager, IMapper mapper)
    {
        _actualLevelManager = actualLevelManager;
        _mapper = mapper;
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _actualLevelManager.ListAll();
    }

    public async Task<object> Create(CreateActualLevelInput input)
    {
        var obj = _mapper.Map<ActualLevel>(input);
        return await _actualLevelManager.Create(obj);
    }

    public async Task Update(UpdateActualLevelInput input)
    {
        var obj = _mapper.Map<ActualLevel>(input);
        await _actualLevelManager.Update(obj);
    }

    public async Task Delete(Guid id)
    {
        await _actualLevelManager.Delete(id);
    }
    
}