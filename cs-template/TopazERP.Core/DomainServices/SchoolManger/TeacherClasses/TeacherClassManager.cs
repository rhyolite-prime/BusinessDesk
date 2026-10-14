using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TeacherClasses
{
    public class TeacherClassManager : Abp.Domain.Services.DomainService, ITeacherClassManager
    {
        private readonly IRepository<TeacherClass, Guid> _repository;

        public TeacherClassManager(IRepository<TeacherClass, Guid> repository)
        {
            _repository = repository;
        }

        public async Task<object> Create(TeacherClass entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x =>
                x.StaffId == entity.StaffId &&
                x.ClassId == entity.ClassId &&
                x.AcademicYearId == entity.AcademicYearId);

            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate teacher-class record not allowed." };
        }

        public async Task Update(TeacherClass entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.ClassId).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}