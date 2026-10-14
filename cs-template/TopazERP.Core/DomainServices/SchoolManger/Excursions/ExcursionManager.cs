using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Excursions;

public class ExcursionManager:DomainService, IExcursionManager
{
    private readonly IRepository<Excursion, Guid> _excursionRepository;

    public ExcursionManager(IRepository<Excursion, Guid> excursionRepository)
    {
        _excursionRepository = excursionRepository;
    }
    
    public async Task<object> Create(Excursion entity)
    {
        var existing = await _excursionRepository.FirstOrDefaultAsync(e =>
            e.DepartureDate == entity.DepartureDate &&
            e.ReturnDate ==  entity.ReturnDate &&
            e.Point == entity.Point &&
            e.Destination == entity.Destination &&
            e.ClassId == entity.ClassId &&
            e.AcademicYearId == entity.AcademicYearId &&
            e.TermId == entity.TermId
        );
        if (existing == null)
        {
            await _excursionRepository.InsertAsync(entity);
            foreach (var student in entity.Students)
            {
                student.ExcursionId = entity.Id;
            }

            foreach (var teacher in entity.Teachers)
            {
                teacher.ExcursionId = entity.Id;
            }
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed."};
        }
       
        
    }
    public async Task Update(Excursion entity)
    {
        await _excursionRepository.UpdateAsync(entity);
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _excursionRepository.GetAllListAsync();
    }
    public async Task Delete(Guid id)
    {
        await _excursionRepository.DeleteAsync(id);
    }
}