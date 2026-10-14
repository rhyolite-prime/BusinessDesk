using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Hostels;

public class HostelManager:Abp.Domain.Services.DomainService, IHostelManager
{
    public readonly IRepository<Hostel, Guid> HostelRepository;
    
    public HostelManager(IRepository<Hostel, Guid> hostelRepository)
    {
        HostelRepository = hostelRepository;
    }

    public async Task<object> Create(Hostel entity)
    {
        var data = await HostelRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await HostelRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed.", id = data.Id };
        }
    }
    public async Task Update(Hostel entity)
    {
        await HostelRepository.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await HostelRepository.GetAllListAsync();
        return data.OrderBy(x => x.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await HostelRepository.DeleteAsync(id);
    }


}