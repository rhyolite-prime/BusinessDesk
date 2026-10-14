using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PtaExecutives;

public class PtaExecutiveManager:Abp.Domain.Services.DomainService, IPtaExecutiveManager
{
  private readonly IRepository<PtaExecutive, Guid> _repositoryPtaExecutive;

  public PtaExecutiveManager(IRepository<PtaExecutive, Guid> repositoryPtaExecutive)
  {
    _repositoryPtaExecutive = repositoryPtaExecutive;
  }
  public async Task<object> Create(PtaExecutive entity)
  {
    var data = await _repositoryPtaExecutive.FirstOrDefaultAsync(
        x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower()
    );

    if (data == null)
    {
      await _repositoryPtaExecutive.InsertAsync(entity);
      return new { code = 200, message = "successful" };
    }

    return new { code = 400, message = "Duplicate records are not allowed." };
  }
  
  public async Task Update(PtaExecutive entity)
  {
    await _repositoryPtaExecutive.UpdateAsync(entity);
  }
  public async Task<IEnumerable<object>> ListAll()
  {
    var data = await _repositoryPtaExecutive.GetAllListAsync();
    return data.OrderBy(d => d.Name).ToList();
  }
  public async Task Delete(Guid id)
  {
    await _repositoryPtaExecutive.DeleteAsync(id);
  }
}