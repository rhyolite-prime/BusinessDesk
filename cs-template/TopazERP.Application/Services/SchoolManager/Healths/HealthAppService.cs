using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Healths;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Healths.Dto;

namespace TopazERP.Services.SchoolManager.Healths;

public class HealthAppService: TopazERPAppServiceBase,IHealthAppService
{
    private readonly IHealthManager _healthManager;
    private readonly IMapper _mapper;


    public HealthAppService(IHealthManager healthManager, IMapper mapper)
    {
        _healthManager = healthManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateHealthInput input)
    {
        var entity = _mapper.Map<Health>(input);
        return await _healthManager.Create(entity);
    }

    public async Task Update(UpdateHealthInput input)
    {
        var entity = _mapper.Map<Health>(input);
        await _healthManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _healthManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _healthManager.Delete(id);
    }
    
}