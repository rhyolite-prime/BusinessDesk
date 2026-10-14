using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Titles;

public class TitleManager : Abp.Domain.Services.DomainService, ITitleManager
{
    private readonly IRepository<Title, Guid> _repositoryTitle;

    public TitleManager(IRepository<Title, Guid> repositoryTitle)
    {
        _repositoryTitle = repositoryTitle;
    }

    public async Task<object> Create(Title entity)
    {
        var data = await _repositoryTitle.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositoryTitle.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(Title entity)
    {
        await _repositoryTitle.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryTitle.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryTitle.DeleteAsync(id);
    }
}