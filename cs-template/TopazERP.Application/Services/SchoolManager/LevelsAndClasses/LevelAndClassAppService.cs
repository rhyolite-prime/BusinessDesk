using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.LevelsAndCLasses;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.LevelsAndClasses.Dto;

namespace TopazERP.Services.SchoolManager.LevelsAndClasses;

/// <summary>
/// 
/// </summary>
public class LevelAndClassAppService: TopazERPAppServiceBase, ILevelAndClassAppService
{
    private readonly ILevelAndClassManager _levelAndClassManager;
    private readonly IMapper _mapper;
    
    public LevelAndClassAppService(ILevelAndClassManager levelAndClassManager, IMapper mapper)
    {
        _levelAndClassManager = levelAndClassManager;
        _mapper = mapper;
    }
    
    //levels
    public async Task<IEnumerable<object>> ListAllLevels()
    {
        return await _levelAndClassManager.ListAllLevels();
    }
    public async Task<object> CreateLevel(CreateLevelInput input)
    {
        var obj = _mapper.Map<Level>(input);
        return await _levelAndClassManager.CreateLevel(obj);
    }

    public async Task UpdateLevel(UpdateLevelInput input)
    {
        var obj = _mapper.Map<Level>(input);
        await _levelAndClassManager.UpdateLevel(obj);
    }
    public async Task DeleteLevel(Guid id)
    {
        await _levelAndClassManager.DeleteLevel(id);
    }
    
    // level classes
    public async Task<IEnumerable<object>> ListAllLevelClasses()
    {
        return await _levelAndClassManager.ListAllLevelClasses();
    }
    public async Task<object> CreateLevelClass(CreateLevelClassInput input)
    {
        var obj = _mapper.Map<LevelClass>(input);
        return await _levelAndClassManager.CreateLevelClass(obj);
    }
    public async Task UpdateLevelClass(UpdateLevelClassInput input)
    {
        var obj = _mapper.Map<LevelClass>(input);
        await _levelAndClassManager.UpdateLevelClass(obj);
    }

    public async Task DeleteLevelClass(Guid id)
    {
        await _levelAndClassManager.DeleteLevelClass(id);
    }

}