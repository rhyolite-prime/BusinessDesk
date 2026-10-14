using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PerformanceAreas;

public class PerformanceAreaManager : Abp.Domain.Services.DomainService, IPerformanceAreaManager
{
    private readonly IRepository<PerformanceArea, Guid> _repositoryPerformanceArea;
    private readonly IRepository<PerformanceSkill, Guid> _repositoryPerformanceSkill;
    private readonly IRepository<StudentPerformanceSkill, Guid> _repositoryStudentPerformanceSkill;
    public PerformanceAreaManager(IRepository<PerformanceArea, Guid> repositoryPerformanceArea, IRepository<PerformanceSkill, Guid> repositoryPerformanceSkill, IRepository<StudentPerformanceSkill, Guid> repositoryStudentPerformanceSkill)
    {
        _repositoryPerformanceArea = repositoryPerformanceArea;
        _repositoryPerformanceSkill = repositoryPerformanceSkill;
        _repositoryStudentPerformanceSkill = repositoryStudentPerformanceSkill;
    }

    public async Task<object> Create(PerformanceArea entity)
    {
        var data = await _repositoryPerformanceArea.FirstOrDefaultAsync(
            x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower()
        );

        if (data == null)
        {
            await _repositoryPerformanceArea.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }

        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(PerformanceArea entity)
    {
        await _repositoryPerformanceArea.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryPerformanceArea.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryPerformanceArea.DeleteAsync(id);
    }
    
    // skill
    public async Task<object> CreateSkill(PerformanceSkill entity)
    {
        var data = await _repositoryPerformanceSkill.FirstOrDefaultAsync(
            x => x.Name == entity.Name && x.PerformanceAreaId == entity.PerformanceAreaId
        );

        if (data == null)
        {
            await _repositoryPerformanceSkill.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }

        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task UpdateSkill(PerformanceSkill entity)
    {
        await _repositoryPerformanceSkill.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAllSkills()
    {
        var data = await _repositoryPerformanceSkill.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task DeleteSkill(Guid id)
    {
        await _repositoryPerformanceSkill.DeleteAsync(id);
    }
    // student perfomance skill
    public async Task<object> CreateStudentPerformanceSkill(StudentPerformanceSkill studentPerformanceSkill)
    {
            await _repositoryStudentPerformanceSkill.InsertAsync(studentPerformanceSkill);
            return new { code = 200, message = "successful" };
    }

    public async Task UpdateStudentPerformanceSkill(StudentPerformanceSkill studentPerformanceSkill)
    {
        await _repositoryStudentPerformanceSkill.UpdateAsync(studentPerformanceSkill);
    }

    public async Task<IEnumerable<object>> ListAllStudentPerformanceSkills()
    {
        var data = await _repositoryStudentPerformanceSkill.GetAllListAsync();
        return data.ToList();
    }

    public async Task DeleteStudentPerformanceSkill(Guid id)
    {
        await _repositoryStudentPerformanceSkill.DeleteAsync(id);
    }
}