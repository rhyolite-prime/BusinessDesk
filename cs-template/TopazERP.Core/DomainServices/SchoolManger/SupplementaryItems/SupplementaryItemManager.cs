using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SupplementaryItems;

public class SupplementaryItemManager : Abp.Domain.Services.DomainService, ISupplementaryItemManager
{
    private readonly IRepository<SupplementaryItem, Guid> _repositorySupplementaryItem;

    public SupplementaryItemManager(IRepository<SupplementaryItem, Guid> repositorySupplementaryItem)
    {
        _repositorySupplementaryItem = repositorySupplementaryItem;
    }

    public async Task<object> Create(SupplementaryItem entity)
    {
        var data = await _repositorySupplementaryItem.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositorySupplementaryItem.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(SupplementaryItem entity)
    {
        await _repositorySupplementaryItem.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositorySupplementaryItem.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositorySupplementaryItem.DeleteAsync(id);
    }
}