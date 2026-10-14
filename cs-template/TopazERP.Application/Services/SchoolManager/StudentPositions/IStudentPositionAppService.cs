using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentPositions.Dto;

namespace TopazERP.Services.SchoolManager.StudentPositions;

public interface IStudentPositionAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreatePositionInput input);
    Task Update(UpdatePositionInput input);
    Task Delete(Guid id);
    // student specific methods
    Task<IEnumerable<object>> ListByStudentId(Guid studentId);
    Task<object> CreateForStudent(CreateStudentPositionInput input);
    Task UpdateForStudent(UpdateStudentPositionInput input);
    Task DeleteForStudent(Guid studentPositionId);
    Task<IEnumerable<object>> GetAllStudentPositions();
}