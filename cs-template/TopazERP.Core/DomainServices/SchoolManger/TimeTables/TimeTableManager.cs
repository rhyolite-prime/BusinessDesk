using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TimeTables;

public class TimeTableManager:Abp.Domain.Services.DomainService, ITimeTableManager
{
    private readonly IRepository<TimeTable, Guid> _timeTableRepository;

    public TimeTableManager(IRepository<TimeTable, Guid> timeTableRepository)
    {
        _timeTableRepository = timeTableRepository;
    }

    public async Task<object> Create(TimeTable entity)
    {
        var data = await _timeTableRepository.FirstOrDefaultAsync(x => x.Day == entity.Day && x.AcademicYearId == entity.AcademicYearId && x.TermId == entity.TermId && x.ClassId == entity.ClassId);
        if (data == null)
        {
            await _timeTableRepository.InsertAsync(entity);
            foreach (var detail in entity.Details)
            {
                detail.TimeTableId = entity.Id;
            }
            
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed.", };
        }
        
    }
    public async Task Update(TimeTable entity)
    {
        await _timeTableRepository.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _timeTableRepository.GetAllListAsync();
        return data.OrderBy(x => x.Day).ToList();
    }
    public async Task Delete(Guid id)
    {
        await _timeTableRepository.DeleteAsync(id);
    }
}