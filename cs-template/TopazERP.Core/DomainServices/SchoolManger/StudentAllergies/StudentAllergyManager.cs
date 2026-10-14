using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentAllergies
{
    public class StudentAllergyManager : Abp.Domain.Services.DomainService, IStudentAllergyManager
    {
        private readonly IRepository<AllergyType, Guid> _repository;
        private readonly IRepository<StudentAllergy, Guid> _studentAllergyRepository;

        public StudentAllergyManager(IRepository<AllergyType, Guid> repository, IRepository<StudentAllergy, Guid> studentAllergyRepository)
        {
            _repository = repository;
            _studentAllergyRepository = studentAllergyRepository;
        }

        public async Task<object> Create(AllergyType entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate allergy not allowed." };
        }

        public async Task Update(AllergyType entity)
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
        
        // student allergy specific methods
        public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
        {
            var data = await _studentAllergyRepository.GetAllListAsync(x => x.StudentId == studentId);
            return data.OrderBy(x => x.AllergyTypeName).ToList();
        }
        
        public async Task<object> CreateStudentAllergy(StudentAllergy entity)
        {
            var duplicate = await _studentAllergyRepository.FirstOrDefaultAsync(x => x.StudentId == entity.StudentId && x.AllergyTypeId == entity.AllergyTypeId);
            if (duplicate == null)
            {
                await _studentAllergyRepository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate student allergy not allowed." };
        }
        public async Task UpdateStudentAllergy(StudentAllergy entity)
        {
            await _studentAllergyRepository.UpdateAsync(entity);
        }
        public async Task DeleteStudentAllergy(Guid id)
        {
            await _studentAllergyRepository.DeleteAsync(id);
        }
        
    }
}