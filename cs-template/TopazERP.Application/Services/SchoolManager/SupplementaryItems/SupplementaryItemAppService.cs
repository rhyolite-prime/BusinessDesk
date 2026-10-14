using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.SupplementaryItems;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.SupplementaryItems.Dto;

namespace TopazERP.Services.SchoolManager.SupplementaryItems;

public class SupplementaryItemAppService : TopazERPAppServiceBase, ISupplementaryItemAppService
{
    private readonly ISupplementaryItemManager _supplementaryItemManager;
    private readonly IMapper _mapper;

    public SupplementaryItemAppService(ISupplementaryItemManager supplementaryItemManager, IMapper mapper)
    {
        _supplementaryItemManager = supplementaryItemManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateSupplementaryItemInput input)
    {
        var entity = _mapper.Map<SupplementaryItem>(input);
        return await _supplementaryItemManager.Create(entity);
    }

    public async Task Update(UpdateSupplementaryItemInput input)
    {
        var entity = _mapper.Map<SupplementaryItem>(input);
        await _supplementaryItemManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _supplementaryItemManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _supplementaryItemManager.Delete(id);
    }
}