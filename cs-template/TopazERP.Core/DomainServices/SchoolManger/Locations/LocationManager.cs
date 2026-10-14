using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Locations;

public class LocationManager: Abp.Domain.Services.DomainService, ILocationManager
{
    private readonly IRepository<Location, Guid> _repositoryLocation;

    public LocationManager(IRepository<Location, Guid> repositoryLocation)
    {
        _repositoryLocation = repositoryLocation;
    }

    public async Task<object> Create(Location entity)
    {
        var data = await _repositoryLocation.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

        if (data == null)
        {
            await _repositoryLocation.InsertAsync(entity);

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
    public async Task Update(Location entity)     
    {
        await _repositoryLocation.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryLocation.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();
    }
    public async Task Delete(Guid id)
    {
        await _repositoryLocation.DeleteAsync(id);
    }
    

}