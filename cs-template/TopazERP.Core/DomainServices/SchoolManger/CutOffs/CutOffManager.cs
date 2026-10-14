using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.CutOffs;

public class CutOffManager: Abp.Domain.Services.DomainService, ICutOffManager
{
    private readonly Abp.Domain.Repositories.IRepository<ConductCutOf, Guid> _repositoryCutOff;

    public CutOffManager(Abp.Domain.Repositories.IRepository<ConductCutOf, Guid> repositoryCutOff)
    {
        _repositoryCutOff = repositoryCutOff;
    }
    
    public async Task<object> Create(ConductCutOf entity)
    {
        var datta = await _repositoryCutOff.FirstOrDefaultAsync(x => x.CutOfMark == entity.CutOfMark);

        if (datta == null)
        {
            await _repositoryCutOff.InsertAsync(entity);

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
    public async Task Update(ConductCutOf entity)
    {
        await _repositoryCutOff.UpdateAsync(entity);
    }

    public async Task<object> GetAsync(Guid id)
    {
        return await _repositoryCutOff.GetAsync(id);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryCutOff.GetAllListAsync();
        return data.OrderBy(data => data.CutOfMark).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryCutOff.DeleteAsync(id);

    }                   
    
}