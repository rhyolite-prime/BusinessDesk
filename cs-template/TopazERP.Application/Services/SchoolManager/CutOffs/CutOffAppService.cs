using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.CutOffs;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.CutOffs.Dto;

namespace TopazERP.Services.SchoolManager.CutOffs;

public class CutOffAppService: TopazERPAppServiceBase, ICutOffAppService
{
    private readonly ICutOffManager _cutOffManager;
    private readonly IMapper _mapper;


    public CutOffAppService(ICutOffManager cutOffManager, IMapper mapper)
    {
        _cutOffManager = cutOffManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateCutOffInput input)
    {
        var entity = _mapper.Map<ConductCutOf>(input);
        return await _cutOffManager.Create(entity);
    }

    public async Task Update(UpdateCutOffInput input)
    {
        var entity = _mapper.Map<ConductCutOf>(input);
        await _cutOffManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _cutOffManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _cutOffManager.Delete(id);
    }
    
}