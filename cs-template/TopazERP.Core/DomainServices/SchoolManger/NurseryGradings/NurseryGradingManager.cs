using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.NurseryGradings;

public class NurseryGradingManager : Abp.Domain.Services.DomainService, INurseryGradingManager
{
    private readonly IRepository<NurseryGrading, Guid> _repositoryNurseryGrading;

    public NurseryGradingManager(IRepository<NurseryGrading, Guid> repositoryNurseryGrading)
    {
        _repositoryNurseryGrading = repositoryNurseryGrading;
    }

    public async Task<object> Create(NurseryGrading entity)
    {
        var data = await _repositoryNurseryGrading.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await _repositoryNurseryGrading.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }

    public async Task Update(NurseryGrading entity)
    {
        await _repositoryNurseryGrading.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryNurseryGrading.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryNurseryGrading.DeleteAsync(id);
    }
}
