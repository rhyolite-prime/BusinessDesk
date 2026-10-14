using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.DistanceGroups;

public class DistanceGroupManager: Abp.Domain.Services.DomainService, IDistanceGroupManager
{
    private readonly IRepository<DistanceGroup, Guid> _distanceGroupRepository;
    public DistanceGroupManager(IRepository<DistanceGroup, Guid> distanceGroupRepository)
    {
        _distanceGroupRepository = distanceGroupRepository;
    }
    public async Task<object> Create(DistanceGroup entity)
    {
        var data = await _distanceGroupRepository.FirstOrDefaultAsync(x => x.Description == entity.Description);

        if (data == null)
        {
            await _distanceGroupRepository.InsertAsync(entity);

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

    public async Task Update(DistanceGroup entity)
    {
        await _distanceGroupRepository.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _distanceGroupRepository.GetAllListAsync();
        return data.OrderBy(data => data.DistanceFrom).ToList();

    }

    public async Task Delete(Guid id)
    {
        await _distanceGroupRepository.DeleteAsync(id);
    }

}