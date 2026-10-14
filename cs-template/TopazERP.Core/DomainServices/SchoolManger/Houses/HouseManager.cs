using System;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Houses;

public class HouseManager:Abp.Domain.Services.DomainService, IHouseManager
{
    public readonly  IRepository<House, Guid> HouseRepository;
    
    public HouseManager(IRepository<House, Guid> houseRepository)
    {
        HouseRepository = houseRepository;
    }
    
    public async Task<object> Create(House entity)
    {
        var data = await HouseRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await HouseRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    
    public async Task Update(House entity)
    {
        await HouseRepository.UpdateAsync(entity);
    }
    
    public async Task<System.Collections.Generic.IEnumerable<object>> ListAll()
    {
        var data = await HouseRepository.GetAllListAsync();
        return data.OrderBy(x => x.Name).ToList();
    }
    
    public async Task Delete(System.Guid id)
    {
        await HouseRepository.DeleteAsync(id);
    }
    
}