using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Assignments;

public interface IAssignmentManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAllByType(string type);
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ClassAssignment assignment);
    Task Update(ClassAssignment assignment);
    Task Delete(Guid id);

    Task<int> GetNextAssignmentNumber(
        Guid academicYearId,
        Guid termId,
        Guid classId,
        Guid subjectId,
        string type
    );
    
    // period for entering results
    Task<IEnumerable<object>> ListAllPeriods();
    Task<object> CreatePeriod(ResultPeriod period);
    Task UpdatePeriod(ResultPeriod period);
    Task DeletePeriod(Guid id);

}