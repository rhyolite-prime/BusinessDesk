using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.TeacherSubjects;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.TeacherSubjects.Dto;

namespace TopazERP.Services.SchoolManager.TeacherSubjects
{
    public class TeacherSubjectAppService : TopazERPAppServiceBase, ITeacherSubjectAppService
    {
        private readonly ITeacherSubjectManager _teacherSubjectManager;
        private readonly IMapper _mapper;

        public TeacherSubjectAppService(ITeacherSubjectManager teacherSubjectManager, IMapper mapper)
        {
            _teacherSubjectManager = teacherSubjectManager;
            _mapper = mapper;
        }

        public async Task<object> Create(CreateTeacherSubjectInput input)
        {
            var entity = _mapper.Map<TeacherSubject>(input);
            return await _teacherSubjectManager.Create(entity);
        }

        public async Task Update(UpdateTeacherSubjectInput input)
        {
            var entity = _mapper.Map<TeacherSubject>(input);
            await _teacherSubjectManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _teacherSubjectManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _teacherSubjectManager.Delete(id);
        }
    }
}