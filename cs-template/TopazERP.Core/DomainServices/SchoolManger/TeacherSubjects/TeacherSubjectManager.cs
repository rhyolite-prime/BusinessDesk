using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TeacherSubjects
{
    public class TeacherSubjectManager : Abp.Domain.Services.DomainService, ITeacherSubjectManager
    {
        private readonly IRepository<TeacherSubject, Guid> _teacherSubjectRepository;

        public TeacherSubjectManager(IRepository<TeacherSubject, Guid> teacherSubjectRepository)
        {
            _teacherSubjectRepository = teacherSubjectRepository;
        }

        public async Task<object> Create(TeacherSubject entity)
        {
            var duplicate = await _teacherSubjectRepository.FirstOrDefaultAsync(x =>
                x.StaffId == entity.StaffId &&
                x.ClassId == entity.ClassId &&
                x.SubjectId == entity.SubjectId &&
                x.AcademicYearId == entity.AcademicYearId);

            if (duplicate == null)
            {
                await _teacherSubjectRepository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate teacher-subject record not allowed." };
        }

        public async Task Update(TeacherSubject entity)
        {
            await _teacherSubjectRepository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _teacherSubjectRepository.GetAllListAsync();
            return data.OrderBy(x => x.SubjectId).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _teacherSubjectRepository.DeleteAsync(id);
        }
    }
}