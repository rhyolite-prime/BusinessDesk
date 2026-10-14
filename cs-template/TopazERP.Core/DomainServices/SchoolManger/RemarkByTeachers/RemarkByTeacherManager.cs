using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.RemarkByTeachers;

public class RemarkByTeacherManager:DomainService, IRemarkByTeacherManager
{
    private readonly IRepository<RemarksByTeacher, Guid> _remarkRepository;

    public RemarkByTeacherManager(IRepository<RemarksByTeacher, Guid> remarkRepository)
    {
        _remarkRepository = remarkRepository;
    }
    
    // list
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _remarkRepository.GetAllListAsync();
        return data.OrderBy(x => x.StudentIdentifier).ToList();
    }
    
    public async Task<object> Create(RemarksByTeacher entity)
    {
        var data = await _remarkRepository.FirstOrDefaultAsync(x => x.ClassId == entity.ClassId && x.AcademicYearId == entity.AcademicYearId && x.StudentId == entity.StudentId && x.TermId == entity.TermId && x.TeacherType == entity.TeacherType && x.RemarkType == entity.RemarkType);
        if (data == null)
        {
            await _remarkRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    public async Task Update(RemarksByTeacher entity)
    {
        await _remarkRepository.UpdateAsync(entity);
    }

}