using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StContactRelationships;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StContactRelationships.Dto;

namespace TopazERP.Services.SchoolManager.StContactRelationships;

public class StContactRelationshipAppService : TopazERPAppServiceBase, IStContactRelationshipAppService
{
    private readonly IStContactRelationshipManager _stContactRelationshipManager;
    private readonly IMapper _mapper;
    
    public StContactRelationshipAppService(IStContactRelationshipManager stContactRelationshipManager, IMapper mapper)
    {
        _stContactRelationshipManager = stContactRelationshipManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStContactRelationshipInput input)
    {
        var entity = _mapper.Map<StContactRelationship>(input);
        return await _stContactRelationshipManager.Create(entity);
    }

    public async Task Update(UpdateStContactRelationshipInput input)
    {
        var entity = _mapper.Map<StContactRelationship>(input);
        await _stContactRelationshipManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _stContactRelationshipManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _stContactRelationshipManager.Delete(id);
    }
}