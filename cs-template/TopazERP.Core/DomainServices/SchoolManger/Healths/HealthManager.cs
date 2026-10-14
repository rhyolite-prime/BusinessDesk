using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Healths;

public class HealthManager: Abp.Domain.Services.DomainService, IHealthManager
{
    private readonly IRepository<Health, Guid> _healthRepository;
    public HealthManager(IRepository<Health, Guid> healthRepository)
    {
        _healthRepository = healthRepository;
    }

    public async Task<object> Create(Health health)
    {
        var datta = await _healthRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == health.Name.Trim().ToLower());
        if (datta == null)
        {
            await _healthRepository.InsertAsync(health);

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
    
    public async Task Update(Health health)
    {
        await _healthRepository.UpdateAsync(health);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _healthRepository.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _healthRepository.DeleteAsync(id);
    }
    
    
}