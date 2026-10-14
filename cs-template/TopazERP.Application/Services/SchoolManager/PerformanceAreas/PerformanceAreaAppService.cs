using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.PerformanceAreas;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.PerformanceAreas.Dto;

namespace TopazERP.Services.SchoolManager.PerformanceAreas;

public class PerformanceAreaAppService : TopazERPAppServiceBase, IPerformanceAreaAppService
{
    private readonly IPerformanceAreaManager _performanceAreaManager;
    private readonly IMapper _mapper;


    public PerformanceAreaAppService(IPerformanceAreaManager performanceAreaManager, IMapper mapper)
    {
        _performanceAreaManager = performanceAreaManager;
        _mapper = mapper;
    }

    // === Performance Areas ===
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _performanceAreaManager.ListAll();
    }

    public async Task<object> Create(CreatePerformanceAreaInput input)
    {
        var entity = _mapper.Map<PerformanceArea>(input);
        return await _performanceAreaManager.Create(entity);
    }

    public async Task Update(UpdatePerformanceAreaInput input)
    {
        var entity = _mapper.Map<PerformanceArea>(input);
        await _performanceAreaManager.Update(entity);
    }

    public async Task Delete(Guid id)
    {
        await _performanceAreaManager.Delete(id);
    }

    // === Performance Skills ===
    public async Task<IEnumerable<object>> ListAllSkills()
    {
        return await _performanceAreaManager.ListAllSkills();
    }

    public async Task<object> CreateSkill(CreatePerformanceSkillInput input)
    {
        var entity = _mapper.Map<PerformanceSkill>(input);
        return await _performanceAreaManager.CreateSkill(entity);
    }

    public async Task UpdateSkill(UpdatePerformanceSkillInput input)
    {
        var entity = _mapper.Map<PerformanceSkill>(input);
        await _performanceAreaManager.UpdateSkill(entity);
    }

    public async Task DeleteSkill(Guid id)
    {
        await _performanceAreaManager.DeleteSkill(id);
    }
    
    // student Perfomance skill
    public async Task<IEnumerable<object>> ListAllStudentPerformanceSkills()
    {
        return await _performanceAreaManager.ListAllStudentPerformanceSkills();
    }
    public async Task<object> CreateStudentPerformanceSkill(CreateStudentPerformanceSkill input)
    {
        var entity = _mapper.Map<StudentPerformanceSkill>(input);
        return await _performanceAreaManager.CreateStudentPerformanceSkill(entity);
    }

    public async Task UpdateStudentPerformanceSkill(UpdateStudentPerfomanceSkill input)
    {
        var entity = _mapper.Map<StudentPerformanceSkill>(input);
        await _performanceAreaManager.UpdateStudentPerformanceSkill(entity);
    }

    public async Task DeleteStudentPerformanceSkill(Guid id)
    {
        await _performanceAreaManager.DeleteStudentPerformanceSkill(id);
    }
}