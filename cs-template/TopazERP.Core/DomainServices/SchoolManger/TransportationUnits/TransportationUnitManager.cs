using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TransportationUnits;

public class TransportationUnitManager : Abp.Domain.Services.DomainService, ITransportationUnitManager
{
    private readonly IRepository<TransportationUnit, Guid> _repositoryTransportationUnit;

    public TransportationUnitManager(IRepository<TransportationUnit, Guid> repositoryTransportationUnit)
    {
        _repositoryTransportationUnit = repositoryTransportationUnit;
    }

    public async Task<object> Create(TransportationUnit entity)
    {
        var data = await _repositoryTransportationUnit.FirstOrDefaultAsync(x => x.UnitName.Trim().ToLower() == entity.UnitName.Trim().ToLower());
        if (data == null)
        {
            await _repositoryTransportationUnit.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(TransportationUnit entity)
    {
        await _repositoryTransportationUnit.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryTransportationUnit.GetAllListAsync();
        return data.OrderBy(d => d.UnitName).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryTransportationUnit.DeleteAsync(id);
    }
}