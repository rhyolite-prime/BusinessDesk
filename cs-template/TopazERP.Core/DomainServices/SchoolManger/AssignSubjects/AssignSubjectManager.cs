using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.AssignSubjects;

public class AssignSubjectManager: Abp.Domain.Services.DomainService, IAssignSubjectManager
{
    private readonly IRepository<AssignedSubject, Guid> _assignedSubjectRepository;
    public AssignSubjectManager(IRepository<AssignedSubject, Guid> assignedSubjectRepository)
    {
        _assignedSubjectRepository = assignedSubjectRepository;
    }

    public async Task<object> Create(AssignedSubject entity)
    {
        var data = await _assignedSubjectRepository.FirstOrDefaultAsync(x =>
            x.AcademicYearId == entity.AcademicYearId &&
            x.ClassId == entity.ClassId &&
            x.TermId == entity.TermId);
        if (data == null)
        {
            await _assignedSubjectRepository.InsertAsync(entity);
            foreach (var detail in entity.Details)
            {
                detail.AssignedSubjectId = entity.Id;
            }
            
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed."};
        }
    }
    public async Task Update(AssignedSubject entity)
    {
        await _assignedSubjectRepository.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _assignedSubjectRepository.GetAllListAsync();
        return data.OrderBy(x => x.AcademicYearName).ThenBy(x => x.ClassName).ThenBy(x => x.TermName).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _assignedSubjectRepository.DeleteAsync(id);
    }

}