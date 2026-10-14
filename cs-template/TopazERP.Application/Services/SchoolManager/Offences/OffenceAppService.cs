using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Offences;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Offences.Dto;

namespace TopazERP.Services.SchoolManager.Offences;

public class OffenceAppService : TopazERPAppServiceBase, IOffenceAppService
{
    private readonly IOffenceManager _offenceManager;
    private readonly IMapper _mapper;
    
    public OffenceAppService(IOffenceManager offenceManager, IMapper mapper)
    {
        _offenceManager = offenceManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateOffenceInput input)
    {
        var entity = _mapper.Map<Offence>(input);
        return await _offenceManager.Create(entity);
    }

    public async Task Update(UpdateOffenceInput input)
    {
        var entity = _mapper.Map<Offence>(input);
        await _offenceManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _offenceManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _offenceManager.Delete(id);
    }
}