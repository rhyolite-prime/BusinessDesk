using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Terms;
using TopazERP.Services.SchoolManager.Terms.Dto;

namespace TopazERP.Services.SchoolManager.Terms;

public class TermAppService: TopazERPAppServiceBase, ITermAppService
{
    private readonly ITermManager _termManager;
    private readonly IMapper _mapper;

    public TermAppService(ITermManager termManager, IMapper mapper)
    {
        _termManager = termManager;
        _mapper = mapper;
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _termManager.ListAll();
    }

    public async Task<object> Create(CreateTermInput term)
    {
        var obj = _mapper.Map<Models.Sch.Term>(term);
        return await _termManager.Create(obj);
    }

    public async Task Update(UpdateTermInput term)
    {
        var obj = _mapper.Map<Models.Sch.Term>(term);
        await _termManager.Update(obj);
    }

    public async Task Delete(Guid id)
    {
        await _termManager.Delete(id);
    }       
    
}