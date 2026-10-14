using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Assignments.Dto;

namespace TopazERP.Services.SchoolManager.Assignments;

public interface IAssignmentAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAllByType(string type);
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateAssignmentInput input);
    Task Update(UpdateAssignmentInput input);
    Task Delete(Guid id);
    Task<int> GetNextAssignmentNumber(
        Guid academicYearId,
        Guid termId,
        Guid classId,
        Guid subjectId,
        string type
    );
    
    // results period
    Task<IEnumerable<object>> ListAllPeriods();
    Task<object> CreatePeriod(CreateResultPeriodInput period);
    Task UpdatePeriod(UpdateResultPeriodInput period);
    Task DeletePeriod(Guid id);
    
    
}