using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Statuses;

public class StatusManager: Abp.Domain.Services.DomainService, IStatusManager
{
    private readonly IRepository<Status, Guid> _repositoryStatus;

    public StatusManager(IRepository<Status, Guid> repositoryStatus)
    {
        _repositoryStatus = repositoryStatus;
    }
    public async Task<object> Create(Status entity)
    {
        var datta = await _repositoryStatus.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryStatus.InsertAsync(entity);

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
    public async Task Update(Status entity)
    {
        await _repositoryStatus.UpdateAsync(entity);
    }
    public async Task<Status> GetAsync(string name)
    {
        return await _repositoryStatus.FirstOrDefaultAsync(x => x.Name == name);
    }
    

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryStatus.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryStatus.DeleteAsync(id);
    }
    
}