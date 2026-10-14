using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;

namespace TopazERP.Services.SchoolManager.DisciplinaryActions;

public interface IDisciplinaryActionAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateDisciplinaryActionInput input); 
    Task Update(UpdateDisciplinaryActionInput input);
    Task Delete(Guid id);
    
    //assign
    Task<IEnumerable<object>> ListAllActions();
    Task<object> CreateStudentDiscAction(CreateStudentDiscActionInput input); 
    Task UpdateStudentDiscAction(UpdateStudentDiscActionInput input);
    Task DeleteStudentDiscAction(Guid id);
}