using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.TerminalSubjects;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.TerminalSubjects.Dto;

namespace TopazERP.Services.SchoolManager.TerminalSubjects
{
    public class TerminalSubjectAppService : TopazERPAppServiceBase, ITerminalSubjectAppService
    {
        private readonly ITerminalSubjectManager _terminalSubjectManager;
        private readonly IMapper _mapper;

        public TerminalSubjectAppService(ITerminalSubjectManager terminalSubjectManager, IMapper mapper)
        {
            _terminalSubjectManager = terminalSubjectManager;
            _mapper = mapper;
        }

        // === Terminal Subject ===
        public async Task<object> Create(CreateTerminalSubjectInput input)
        {
            var entity = _mapper.Map<TerminalSubject>(input);
            return await _terminalSubjectManager.Create(entity);
        }

        public async Task Update(UpdateTerminalSubjectInput input)
        {
            var entity = _mapper.Map<TerminalSubject>(input);
            await _terminalSubjectManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _terminalSubjectManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _terminalSubjectManager.Delete(id);
        }

        // === Terminal Sub Subject ===
        public async Task<object> CreateSubSubject(CreateTerminalSubSubjectInput input)
        {
            var entity = ObjectMapper.Map<TerminalSubSubject>(input);
            return await _terminalSubjectManager.CreateSubSubject(entity);
        }

        public async Task UpdateSubSubject(UpdateTerminalSubSubjectInput input)
        {
            var entity = ObjectMapper.Map<TerminalSubSubject>(input);
            await _terminalSubjectManager.UpdateSubSubject(entity);
        }

        public async Task<IEnumerable<object>> ListAllSubSubjects()
        {
            return await _terminalSubjectManager.ListAllSubSubjects();
        }

        public async Task DeleteSubSubject(Guid id)
        {
            await _terminalSubjectManager.DeleteSubSubject(id);
        }
    }
}
