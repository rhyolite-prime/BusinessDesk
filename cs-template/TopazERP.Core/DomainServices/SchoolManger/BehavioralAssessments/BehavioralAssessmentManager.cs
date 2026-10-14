using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.BehavioralAssessments;

public class BehavioralAssessmentManager: Abp.Domain.Services.DomainService,IBehavioralAssessmentManager
{
    private readonly IRepository<BehavioralAssessment, Guid> _behavioralAssessmentRepository;

    public BehavioralAssessmentManager(IRepository<BehavioralAssessment, Guid> behavioralAssessmentRepository)
    {
        _behavioralAssessmentRepository = behavioralAssessmentRepository;
    }

    public async Task<IEnumerable<object>> ListAllByType(string assessmentType)
    {
        var allData = await _behavioralAssessmentRepository.GetAllListAsync();
        var filtered = allData.Where(a => a.AssessmentType == assessmentType).ToList();
        return filtered;
    }

    public async Task<object> Create(BehavioralAssessment entity)
    {
        var data = await _behavioralAssessmentRepository.FirstOrDefaultAsync
        (a =>
            a.AcademicYearId == entity.AcademicYearId &&
            a.ClassId == entity.ClassId &&
            a.TermId == entity.TermId &&
            a.AssessmentType == entity.AssessmentType
        );

        if (data == null)
        {
            await _behavioralAssessmentRepository.InsertAsync(entity);
            foreach (var detail in entity.Assessments)
            {
                detail.BehavioralAssessmentId = entity.Id.ToString();
            }
            return new { code = 200, message = "successful"};
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed."};
        }
    }

    public async Task Update(BehavioralAssessment entity)
    {
        await _behavioralAssessmentRepository.UpdateAsync(entity);
    }
    public async Task Delete(Guid id)
    {
        await _behavioralAssessmentRepository.DeleteAsync(id);
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _behavioralAssessmentRepository.GetAllListAsync();
        return data.ToList();
    }
}