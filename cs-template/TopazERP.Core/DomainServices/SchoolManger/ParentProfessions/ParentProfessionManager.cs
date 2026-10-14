using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ParentProfessions;

public class ParentProfessionManager : Abp.Domain.Services.DomainService, IParentProfessionManager
{
    private readonly IRepository<ParentProfession, Guid> _repositoryParentProfession;

    public ParentProfessionManager(IRepository<ParentProfession, Guid> repositoryParentProfession)
    {
        _repositoryParentProfession = repositoryParentProfession;
    }

    public async Task<object> Create(ParentProfession entity)
    {
        var data = await _repositoryParentProfession.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositoryParentProfession.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }

    public async Task Update(ParentProfession entity)
    {
        await _repositoryParentProfession.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryParentProfession.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryParentProfession.DeleteAsync(id);
    }
}