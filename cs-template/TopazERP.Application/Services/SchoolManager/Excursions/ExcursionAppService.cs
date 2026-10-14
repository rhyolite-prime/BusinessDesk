using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Excursions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Excursions.Dto;

namespace TopazERP.Services.SchoolManager.Excursions;

public class ExcursionAppService: TopazERPAppServiceBase,IExcursionAppService
{
    private readonly IExcursionManager _excursionManager;
    private readonly IMapper _mapper;

    public ExcursionAppService(IExcursionManager excursionManager, IMapper mapper)
    {
        _excursionManager = excursionManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateExcursionInput input)
    {
        var entity = _mapper.Map<Excursion>(input);
        return await _excursionManager.Create(entity);
    }
    
    public async Task Update(UpdateExcursionInput input)
    {
        var entity = _mapper.Map<Excursion>(input);
         await _excursionManager.Update(entity);
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _excursionManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _excursionManager.Delete(id);
    }
}