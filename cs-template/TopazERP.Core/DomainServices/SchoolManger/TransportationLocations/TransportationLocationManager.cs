using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TransportationLocations;

public class TransportationLocationManager : Abp.Domain.Services.DomainService, ITransportationLocationManager
{
    private readonly IRepository<TransportationLocation, Guid> _repositoryTransportationLocation;

    public TransportationLocationManager(IRepository<TransportationLocation, Guid> repositoryTransportationLocation)
    {
        _repositoryTransportationLocation = repositoryTransportationLocation;
    }

    public async Task<object> Create(TransportationLocation entity)
    {
        var data = await _repositoryTransportationLocation.FirstOrDefaultAsync(
            x => x.LocationName.Trim().ToLower() == entity.LocationName.Trim().ToLower() && x.TransportationUnitId == entity.TransportationUnitId
        );

        if (data == null)
        {
            await _repositoryTransportationLocation.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(TransportationLocation entity)
    {
        await _repositoryTransportationLocation.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryTransportationLocation.GetAllListAsync();
        return data.OrderBy(d => d.LocationName).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryTransportationLocation.DeleteAsync(id);
    }
}