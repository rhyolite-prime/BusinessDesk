using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.MidTermAssessments;

public interface IMidTermAssessmentManager:IDomainService
{
    // assessment headers
    Task<IEnumerable<object>> ListAllAssessmentHeaders();
    Task<object> CreateHeader(AssessmentRemarkHeader input); 
    Task UpdateHeader(AssessmentRemarkHeader input);
    Task DeleteHeader(Guid id);
    
    //main assessment
    Task<IEnumerable<object>> ListAllMidTermAssessments();
    Task<IEnumerable<object>> GetMidTermAssessmentByStudentId(Guid studentId);
    Task<object> CreateMidTermAssessment(MidTermAssessment input);
    Task UpdateMidTermAssessment(MidTermAssessment input);
    Task DeleteMidTermAssessment(Guid id);
}