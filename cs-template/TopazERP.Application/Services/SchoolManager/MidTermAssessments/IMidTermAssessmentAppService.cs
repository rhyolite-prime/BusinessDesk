using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.MidTermAssessments.Dto;

namespace TopazERP.Services.SchoolManager.MidTermAssessments;

public interface IMidTermAssessmentAppService:IApplicationService
{
    //assessment header
    Task<IEnumerable<object>> ListAllAssessmentHeaders();
    Task<object> CreateHeader(CreateAssessmentHeaderInput input); 
    Task UpdateHeader(UpdateAssessmentHeaderInput input);
    Task DeleteHeader(Guid id);
    
    //main assessment
    Task<IEnumerable<object>> ListAllMidTermAssessments();
    Task<IEnumerable<object>> GetMidTermAssessmentByStudentId(Guid studentId);
    Task<object> CreateMidTermAssessment(CreateMTAssessmentInput input);
    Task UpdateMidTermAssessment(UpdateMTAssessmentInput input);
    Task DeleteMidTermAssessment(Guid id);
    
}