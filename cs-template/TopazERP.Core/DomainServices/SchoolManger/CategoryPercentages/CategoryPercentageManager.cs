using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.CategoryPercentages;

public class CategoryPercentageManager:Abp.Domain.Services.DomainService, ICategoryPercentageManager
{
    public readonly IRepository<CategoryPercentage, Guid> CategoryPercentageRepository;
    
    public CategoryPercentageManager(IRepository<CategoryPercentage, Guid> categoryPercentageRepository)
    {
        CategoryPercentageRepository = categoryPercentageRepository;
    }
    
    public async Task<object> Create(CategoryPercentage entity)
    {
        var data = await CategoryPercentageRepository.FirstOrDefaultAsync(x =>
            x.ExamPercentage == entity.ExamPercentage && x.Cat1Percentage == entity.Cat1Percentage && x.Cat2Percentage == entity.Cat2Percentage && x.Cat3Percentage == entity.Cat3Percentage && x.Cat4Percentage == entity.Cat4Percentage);
        if (data == null)
        {
            await CategoryPercentageRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed.", id = data.Id };
        }
    }
    public async Task Update(CategoryPercentage entity)
    {
        await CategoryPercentageRepository.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await CategoryPercentageRepository.GetAllListAsync();
        return data.ToList();
    }
    public async Task Delete(Guid id)
    {
        await CategoryPercentageRepository.DeleteAsync(id);
    }
    
}