using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Offences;

public class OffenceManager : Abp.Domain.Services.DomainService, IOffenceManager
{
    private readonly IRepository<Offence, Guid> _repositoryOffence;

    public OffenceManager(IRepository<Offence, Guid> repositoryOffence)
    {
        _repositoryOffence = repositoryOffence;
    }

    public async Task<object> Create(Offence entity)
    {
        var data = await _repositoryOffence.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositoryOffence.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }

    public async Task Update(Offence entity)
    {
        await _repositoryOffence.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryOffence.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryOffence.DeleteAsync(id);
    }
}
