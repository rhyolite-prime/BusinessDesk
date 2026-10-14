using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.DisciplinaryActions;

public interface IDisciplinaryActionManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(DisciplinaryAction action); 
    Task Update(DisciplinaryAction action);
    Task Delete(Guid id);
    
    //assign
    Task<IEnumerable<object>> ListAllActions();
    Task<object> CreateStudentDiscAction(StudentDisciplinaryAction action); 
    Task UpdateStudentDiscAction(StudentDisciplinaryAction action);
    Task DeleteStudentDiscAction(Guid id);
    
}