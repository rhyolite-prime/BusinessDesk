using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ActualLevels;

public class ActualLevelManager: Abp.Domain.Services.DomainService, IActualLevelManager
{
    private readonly IRepository<ActualLevel, Guid> _repositoryActualLevel;

    public ActualLevelManager(IRepository<ActualLevel, Guid> repositoryActualLevel)
    {
        _repositoryActualLevel = repositoryActualLevel;
    }
    
    public async Task<object> Create(ActualLevel entity)
    {
        var datta = await _repositoryActualLevel.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryActualLevel.InsertAsync(entity);

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
    public async Task Update(ActualLevel entity)
    {
        await _repositoryActualLevel.UpdateAsync(entity);
    }

    public async Task<object> GetAsync(Guid id)
    {
        return await _repositoryActualLevel.GetAsync(id);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryActualLevel.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryActualLevel.DeleteAsync(id);

    }
}