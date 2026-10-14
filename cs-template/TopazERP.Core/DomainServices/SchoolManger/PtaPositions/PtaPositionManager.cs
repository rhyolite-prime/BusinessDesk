using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PtaPositions;

public class PtaPositionManager : Abp.Domain.Services.DomainService, IPtaPositionManager
{
    private readonly IRepository<PtaPosition, Guid> _repositoryPtaPosition;

    public PtaPositionManager(IRepository<PtaPosition, Guid> repositoryPtaPosition)
    {
        _repositoryPtaPosition = repositoryPtaPosition;
    }

    public async Task<object> Create(PtaPosition entity)
    {
        var data = await _repositoryPtaPosition.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositoryPtaPosition.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(PtaPosition entity)
    {
        await _repositoryPtaPosition.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryPtaPosition.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryPtaPosition.DeleteAsync(id);
    }
}