using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.DistanceUnits;

public class DistanceUnitManager: Abp.Domain.Services.DomainService,IDistanceUnitManager
{
    private readonly IRepository<DistanceUnit, Guid> _repositoryDistanceUnit;
    public DistanceUnitManager(IRepository<DistanceUnit, Guid> repositoryDistanceUnit)
    {
        _repositoryDistanceUnit = repositoryDistanceUnit;
    }
    public async Task<object> Create(DistanceUnit entity)
    {
        var datta = await _repositoryDistanceUnit.FirstOrDefaultAsync(x => x.UnitName == entity.UnitName);
        if (datta == null)
        {
            await _repositoryDistanceUnit.InsertAsync(entity);

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
    public async Task Update(DistanceUnit entity)
    {
        await _repositoryDistanceUnit.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryDistanceUnit.GetAllListAsync();
        return data.OrderBy(data => data.UnitName).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryDistanceUnit.DeleteAsync(id);
    }
}