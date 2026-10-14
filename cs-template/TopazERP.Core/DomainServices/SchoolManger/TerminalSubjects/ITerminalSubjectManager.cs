using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TerminalSubjects;

public interface ITerminalSubjectManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(TerminalSubject terminalSubject);
    Task Update(TerminalSubject terminalSubject);
    Task Delete(Guid id);
    
    //sub subject
    Task<IEnumerable<object>> ListAllSubSubjects();
    Task<object> CreateSubSubject(TerminalSubSubject terminalSubSubject);
    Task UpdateSubSubject(TerminalSubSubject terminalSubSubject);
    Task DeleteSubSubject(Guid id);
}