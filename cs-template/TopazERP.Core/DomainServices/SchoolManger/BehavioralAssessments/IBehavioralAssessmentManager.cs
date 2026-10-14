using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.BehavioralAssessments;

public interface IBehavioralAssessmentManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAllByType(string assessmentType);
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(BehavioralAssessment entity);
    Task Update(BehavioralAssessment entity);
    Task Delete(Guid id);
}