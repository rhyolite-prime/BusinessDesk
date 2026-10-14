using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ClassLevelPercentages;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ClassLevelPercentages.Dto;

namespace TopazERP.Services.SchoolManager.ClassLevelPercentages;

public class ClassLevelPercentageAppService: TopazERPAppServiceBase, IClassLevelPercentageAppService
{
    private readonly IClassLevelPercentageManager _classLevelPercentageManager;
    private readonly IMapper _mapper;


    public ClassLevelPercentageAppService(IClassLevelPercentageManager classLevelPercentageManager, IMapper mapper)
    {
        _classLevelPercentageManager = classLevelPercentageManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateClassLevelPercentageInput input)
    {
        var entity = _mapper.Map<ClassLevelPercentage>(input);
        return await _classLevelPercentageManager.Create(entity);
    }

    public async Task Update(UpdateClassLevelPercentageInput input)
    {
        var entity = _mapper.Map<ClassLevelPercentage>(input);
        await _classLevelPercentageManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _classLevelPercentageManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _classLevelPercentageManager.Delete(id);
    }
    
}