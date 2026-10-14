using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.LevelsAndCLasses;

public class LevelAndClassManager: Abp.Domain.Services.DomainService, ILevelAndClassManager
{
    private readonly IRepository<Level, Guid> _levelRepository;
    private readonly IRepository<LevelClass, Guid> _levelClassRepository;

    public LevelAndClassManager(IRepository<Level, Guid> levelRepository, IRepository<LevelClass, Guid> levelClassRepository)
    {
        _levelRepository = levelRepository;
        _levelClassRepository = levelClassRepository;
    }
    
    //levels
    public async Task<IEnumerable<object>> ListAllLevels()
    {
        var levels = await _levelRepository.GetAllListAsync();
        return levels;
    }
    
    public async Task<object> CreateLevel(Level input)
    {
        var datta = await _levelRepository.FirstOrDefaultAsync(x => x.LevelName.Trim().ToLower() == input.LevelName.Trim().ToLower());

        if (datta == null)
        {
            await _levelRepository.InsertAsync(input);

            return new
            {
                code = 200,
                message = "successful"
            };
        }
        else
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }
    }
    public async Task UpdateLevel(Level input)
    {
        await _levelRepository.UpdateAsync(input);
    }
    public async Task DeleteLevel(Guid id)
    {
        await _levelRepository.DeleteAsync(id);
    }
    
    // level classes
    public async Task<IEnumerable<object>> ListAllLevelClasses()
    {
        var levelClasses = await _levelClassRepository.GetAllListAsync();
        return levelClasses;
    }
    
    public async Task<object> CreateLevelClass(LevelClass input)
    {
        var datta = await _levelClassRepository.FirstOrDefaultAsync(x => x.ClassName.Trim().ToLower() == input.ClassName.Trim().ToLower() && x.LevelId == input.LevelId && x.StreamId == input.StreamId);

        if (datta == null)
        {
            await _levelClassRepository.InsertAsync(input);

            return new
            {
                code = 200,
                message = "successful"
            };
        }
        else
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }
    }

    public async Task UpdateLevelClass(LevelClass input)
    {
        await _levelClassRepository.UpdateAsync(input);
    }
    public async Task DeleteLevelClass(Guid id)
    {
        await _levelClassRepository.DeleteAsync(id);
    }
}