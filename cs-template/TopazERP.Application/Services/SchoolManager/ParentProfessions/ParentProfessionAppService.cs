using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ParentProfessions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ParentProfessions.Dto;

namespace TopazERP.Services.SchoolManager.ParentProfessions;

public class ParentProfessionAppService : TopazERPAppServiceBase, IParentProfessionAppService
{
    private readonly IParentProfessionManager _parentProfessionManager;
    private readonly IMapper _mapper;
    
    public ParentProfessionAppService(IParentProfessionManager parentProfessionManager, IMapper mapper)
    {
        _parentProfessionManager = parentProfessionManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateParentProfessionInput input)
    {
        var entity = _mapper.Map<ParentProfession>(input);
        return await _parentProfessionManager.Create(entity);
    }

    public async Task Update(UpdateParentProfessionInput input)
    {
        var entity = _mapper.Map<ParentProfession>(input);
        await _parentProfessionManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _parentProfessionManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _parentProfessionManager.Delete(id);
    }
}