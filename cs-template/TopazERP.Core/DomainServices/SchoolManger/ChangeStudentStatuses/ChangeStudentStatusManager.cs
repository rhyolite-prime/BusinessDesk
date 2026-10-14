using System;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ChangeStudentStatuses;

public class ChangeStudentStatusManager: Abp.Domain.Services.DomainService, IChangeStudentStatusManager
{
    private readonly IRepository<StatusChange, Guid> _repositoryStatusChange;
    private readonly IRepository<StudentInfo, Guid> _repositoryStudentInfo;
    public ChangeStudentStatusManager(IRepository<StatusChange, Guid> repositoryStatusChange, IRepository<StudentInfo, Guid> repositoryStudentInfo)
    {
        _repositoryStatusChange = repositoryStatusChange;
        _repositoryStudentInfo = repositoryStudentInfo;
    }
    public async Task<object> CreateStudentStatus(StatusChange input)
    {
        await _repositoryStatusChange.InsertAsync(input);
        var student = await _repositoryStudentInfo.GetAsync(input.StudentId);
        student.StatusId = input.StatusId;
        student.StatusName = input.StatusName;
        await _repositoryStudentInfo.UpdateAsync(student);
        return new
        {
            code = 200,
            message = "successful"
        };
        
    }

    public async Task UpdateStudentStatus(StatusChange input)
    {
        await _repositoryStatusChange.UpdateAsync(input);
        var student = await _repositoryStudentInfo.GetAsync(input.StudentId);
        student.StatusId = input.StatusId;
        student.StatusName = input.StatusName;
        await _repositoryStudentInfo.UpdateAsync(student);
    }            
   
    
}