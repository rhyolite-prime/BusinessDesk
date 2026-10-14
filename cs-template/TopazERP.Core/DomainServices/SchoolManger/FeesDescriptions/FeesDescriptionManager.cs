using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.FeesDescriptions;

public class FeesDescriptionManager: Abp.Domain.Services.DomainService, IFeesDescriptionManager
{
    private readonly IRepository<FeesDescription, Guid> _repositoryFeesDescription;

    public FeesDescriptionManager(IRepository<FeesDescription, Guid> repositoryFeesDescription)
    {
        _repositoryFeesDescription = repositoryFeesDescription;
    }
    public async Task<object> Create(FeesDescription entity)
    {
        var data = await _repositoryFeesDescription.FirstOrDefaultAsync(x => x.Description.Trim().ToLower() == entity.Description.Trim().ToLower());

        if (data == null)
        {
            await _repositoryFeesDescription.InsertAsync(entity);

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
    public async Task Update(FeesDescription entity)
    {
        await _repositoryFeesDescription.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryFeesDescription.GetAllListAsync();
        return data.OrderBy(f => f.Description).ToList();
    }
    public async Task Delete(Guid id)
    {
        await _repositoryFeesDescription.DeleteAsync(id);
    }
}