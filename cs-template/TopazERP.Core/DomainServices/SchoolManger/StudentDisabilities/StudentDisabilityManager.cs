using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentDisabilities
{
    public class StudentDisabilityManager : Abp.Domain.Services.DomainService, IStudentDisabilityManager
    {
        private readonly IRepository<Disability, Guid> _repository;
        private readonly IRepository<StudentDisability, Guid> _studentDisabilityRepository;

        public StudentDisabilityManager(IRepository<Disability, Guid> repository, IRepository<StudentDisability, Guid> studentDisabilityRepository)
        {
            _repository = repository;
            _studentDisabilityRepository = studentDisabilityRepository;
        }

        public async Task<object> Create(Disability entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate disability not allowed." };
        }

        public async Task Update(Disability entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.Name).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
        
        // student-specific methods
        public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
        {
            var data = await _studentDisabilityRepository.GetAllListAsync(x => x.StudentId == studentId);
            return data.OrderBy(x => x.DisabilityName).ToList();
        }
        
        public async Task<object> CreateForStudent(StudentDisability entity)
        {
            var duplicate = await _studentDisabilityRepository.FirstOrDefaultAsync(x => x.StudentId == entity.StudentId && x.DisabilityId == entity.DisabilityId);
            if (duplicate == null)
            {
                await _studentDisabilityRepository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate disability for student not allowed." };
        }
        
        public async Task UpdateForStudent(StudentDisability entity)
        {
            await _studentDisabilityRepository.UpdateAsync(entity);
        }
        public async Task DeleteForStudent(Guid id)
        {
            await _studentDisabilityRepository.DeleteAsync(id);
        }
    }
}