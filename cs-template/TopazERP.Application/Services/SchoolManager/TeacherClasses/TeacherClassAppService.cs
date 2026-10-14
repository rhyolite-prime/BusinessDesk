using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.TeacherClasses;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.TeacherClasses.Dto;

namespace TopazERP.Services.SchoolManager.TeacherClasses
{
    public class TeacherClassAppService : TopazERPAppServiceBase, ITeacherClassAppService
    {
        private readonly ITeacherClassManager _teacherClassManager;
        private readonly IMapper _mapper;

        public TeacherClassAppService(ITeacherClassManager teacherClassManager, IMapper mapper)
        {
            _teacherClassManager = teacherClassManager;
            _mapper = mapper;
        }

        public async Task<object> Create(CreateTeacherClassInput input)
        {
            var entity = _mapper.Map<TeacherClass>(input);
            return await _teacherClassManager.Create(entity);
        }

        public async Task Update(UpdateTeacherClassInput input)
        {
            var entity = _mapper.Map<TeacherClass>(input);
            await _teacherClassManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _teacherClassManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _teacherClassManager.Delete(id);
        }
    }
}