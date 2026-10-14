using System;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassLevelPercentages;

public class ClassLevelPercentageManager:Abp.Domain.Services.DomainService, IClassLevelPercentageManager
{
    public readonly IRepository<ClassLevelPercentage, Guid> ClassLevelPercentageRepository;
    
    public ClassLevelPercentageManager(IRepository<ClassLevelPercentage, Guid> classLevelPercentageRepository)
    {
        ClassLevelPercentageRepository = classLevelPercentageRepository;
    }
    
    public async Task<object> Create(ClassLevelPercentage entity)
    {
        var data = await ClassLevelPercentageRepository.FirstOrDefaultAsync(x =>
            x.AcademicYearId == entity.AcademicYearId);
        if (data == null)
        {
            await ClassLevelPercentageRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    public async Task Update(ClassLevelPercentage entity)
    {
        await ClassLevelPercentageRepository.UpdateAsync(entity);
    }

    public async Task<System.Collections.Generic.IEnumerable<object>> ListAll()
    {
        var data = await ClassLevelPercentageRepository.GetAllListAsync();
        return data.OrderBy(x => x.AcademicYearName).ToList();
    }
    public async Task Delete(Guid id)
    {
        await ClassLevelPercentageRepository.DeleteAsync(id);
    }


}