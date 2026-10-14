using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.MidTermAssessments;

public class MidTermAssessmentManager:DomainService,IMidTermAssessmentManager
{
    private readonly IRepository<AssessmentRemarkHeader, Guid> _assessmentRemarkHeaderRepository;
    private readonly IRepository<MidTermAssessment, Guid> _midTermAssessmentRepository;

    public MidTermAssessmentManager(IRepository<AssessmentRemarkHeader, Guid> assessmentRemarkHeaderRepository, IRepository<MidTermAssessment, Guid> midTermAssessmentRepository)
    {
        _assessmentRemarkHeaderRepository = assessmentRemarkHeaderRepository;
        _midTermAssessmentRepository = midTermAssessmentRepository;
    }
    
    // header methods
    public async Task<object> CreateHeader(AssessmentRemarkHeader entity)
    {
        var data = await _assessmentRemarkHeaderRepository.FirstOrDefaultAsync
        (a =>
            a.Name.Trim().ToLower() == entity.Name.Trim().ToLower()
        );

        if (data == null)
        {
            await _assessmentRemarkHeaderRepository.InsertAsync(entity);
            foreach (var detail in entity.Options)
            {
                detail.RemarkId = entity.Id;
            }
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed."};
        }
    }
    public async Task UpdateHeader(AssessmentRemarkHeader entity)
    {
        await _assessmentRemarkHeaderRepository.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAllAssessmentHeaders()
    {
        var data = await _assessmentRemarkHeaderRepository.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();
    }
    public async Task DeleteHeader(Guid id)
    {
        await _assessmentRemarkHeaderRepository.DeleteAsync(id);
    }
    
    // main assessment methods
    public async Task<IEnumerable<object>> ListAllMidTermAssessments()
    {
        var data = await _midTermAssessmentRepository.GetAllListAsync();
        return data.OrderBy(data => data.ClassId).ToList();
    }
    public async Task<IEnumerable<object>> GetMidTermAssessmentByStudentId(Guid studentId)
    {
        var data =  await _midTermAssessmentRepository.FirstOrDefaultAsync(
            x => x.Assessment != null && x.Assessment.Any(a => a.StudentId == studentId)
        );
        return data.Assessment.Where(x => x.StudentId == studentId).ToList();
    }
    public async Task<object> CreateMidTermAssessment(MidTermAssessment entity)
    {
        var data = await _midTermAssessmentRepository.FirstOrDefaultAsync
        (a =>
            a.ClassId == entity.ClassId &&
            a.TermId == entity.TermId &&
            a.AcademicYearId == entity.AcademicYearId
        );

        if (data == null)
        {
            await _midTermAssessmentRepository.InsertAsync(entity);
            foreach (var detail in entity.Assessment)
            {
                detail.MidTermAssessmentId = entity.Id;
            }
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed."};
        }
    }
    public async Task UpdateMidTermAssessment(MidTermAssessment input)
    {
        await _midTermAssessmentRepository.UpdateAsync(input);
    }
    public async Task DeleteMidTermAssessment(Guid id)
    {
        await _midTermAssessmentRepository.DeleteAsync(id);
    }
   
}