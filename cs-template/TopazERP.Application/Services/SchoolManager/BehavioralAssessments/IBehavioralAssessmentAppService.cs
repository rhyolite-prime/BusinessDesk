using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.BehavioralAssessments.Dto;

namespace TopazERP.Services.SchoolManager.BehavioralAssessments;

public interface IBehavioralAssessmentAppService: IApplicationService
{
    Task<IEnumerable<object>> ListAllByType(string assessmentType);
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateBehavioralAssessmentInput input);
    Task Update(UpdateBehavioralAssessmentInput input);
    Task Delete(Guid id);
}