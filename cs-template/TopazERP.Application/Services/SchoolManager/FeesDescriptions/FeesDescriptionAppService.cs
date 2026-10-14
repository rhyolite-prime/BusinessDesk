using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.FeesDescriptions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.FeesDescriptions.Dto;

namespace TopazERP.Services.SchoolManager.FeesDescriptions;

public class FeesDescriptionAppService : TopazERPAppServiceBase, IFeesDescriptionAppService
{
    private readonly IFeesDescriptionManager _feesDescriptionManager;
    private readonly IMapper _mapper;


    public FeesDescriptionAppService(IFeesDescriptionManager feesDescriptionManager, IMapper mapper)
    {
        _feesDescriptionManager = feesDescriptionManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateFeesDescriptionInput input)
    {
        var entity = _mapper.Map<FeesDescription>(input);
        return await _feesDescriptionManager.Create(entity);
    }

    public async Task Update(UpdateFeesDescriptionInput input)
    {
        var entity = _mapper.Map<FeesDescription>(input);
        await _feesDescriptionManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _feesDescriptionManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _feesDescriptionManager.Delete(id);
    }
}