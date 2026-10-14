using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.NurseryGradings;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.NurseryGradings.Dto;

namespace TopazERP.Services.SchoolManager.NurseryGradings;

public class NurseryGradingAppService : TopazERPAppServiceBase, INurseryGradingAppService
{
    private readonly INurseryGradingManager _nurseryGradingManager;
    private readonly IMapper _mapper;


    public NurseryGradingAppService(INurseryGradingManager nurseryGradingManager, IMapper mapper)
    {
        _nurseryGradingManager = nurseryGradingManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateNurseryGradingInput input)
    {
        var entity = _mapper.Map<NurseryGrading>(input);
        return await _nurseryGradingManager.Create(entity);
    }

    public async Task Update(UpdateNurseryGradingInput input)
    {
        var entity = _mapper.Map<NurseryGrading>(input);
        await _nurseryGradingManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _nurseryGradingManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _nurseryGradingManager.Delete(id);
    }
}