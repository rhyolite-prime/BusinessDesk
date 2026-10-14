using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.TerminalSubjects.Dto;

namespace TopazERP.Services.SchoolManager.TerminalSubjects
{
    public interface ITerminalSubjectAppService : Abp.Application.Services.IApplicationService
    {
        // === Terminal Subjects ===
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateTerminalSubjectInput input);
        Task Update(UpdateTerminalSubjectInput input);
        Task Delete(Guid id);

        // === Terminal Sub Subjects ===
        Task<IEnumerable<object>> ListAllSubSubjects();
        Task<object> CreateSubSubject(CreateTerminalSubSubjectInput input);
        Task UpdateSubSubject(UpdateTerminalSubSubjectInput input);
        Task DeleteSubSubject(Guid id);
    }
}