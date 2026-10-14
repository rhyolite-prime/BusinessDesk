using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassRooms;

public class ClassRoomManager:Abp.Domain.Services.DomainService, IClassRoomManager
{
    public readonly  IRepository<ClassRoom, Guid> ClassRoomRepository;
    
    public ClassRoomManager(IRepository<ClassRoom, Guid> classRoomRepository)
    {
        ClassRoomRepository = classRoomRepository;
    }
    
    public async Task<object> Create(ClassRoom entity)
    {
        var data = await ClassRoomRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (data == null)
        {
            await ClassRoomRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    
    public async Task Update(ClassRoom entity)
    {
        await ClassRoomRepository.UpdateAsync(entity);
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await ClassRoomRepository.GetAllListAsync();
        return data.OrderBy(x => x.Name).ToList();
    }
    
    public async Task Delete(Guid id)
    {
        await ClassRoomRepository.DeleteAsync(id);
    }
    
}