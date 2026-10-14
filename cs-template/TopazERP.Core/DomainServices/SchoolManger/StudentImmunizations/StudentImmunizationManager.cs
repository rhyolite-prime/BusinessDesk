using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentImmunizations
{
    public class StudentImmunizationManager : Abp.Domain.Services.DomainService, IStudentImmunizationManager
    {
        private readonly IRepository<ImmunizationType, Guid> _repository;
        private readonly IRepository<StudentImmunization, Guid> _studentImmunizationRepository;

        public StudentImmunizationManager(IRepository<ImmunizationType, Guid> repository, IRepository<StudentImmunization, Guid> studentImmunizationRepository)
        {
            _repository = repository;
            _studentImmunizationRepository = studentImmunizationRepository;
        }

        public async Task<object> Create(ImmunizationType entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate immunization not allowed." };
        }

        public async Task Update(ImmunizationType entity)
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
        
        //student specific methods
        public async Task<IEnumerable<object>> ListAllByStudentId(Guid studentId)
        {
            var data = await _studentImmunizationRepository.GetAllListAsync(x => x.StudentId == studentId);
            return data.OrderBy(x => x.ImmunizationDate).ToList();
        }
        public async Task<object> CreateForStudent(StudentImmunization entity)
        {
            var duplicate = await _studentImmunizationRepository.FirstOrDefaultAsync(x => x.StudentId == entity.StudentId && x.ImmunizationTypeId == entity.ImmunizationTypeId && x.ImmunizationDate == entity.ImmunizationDate);
            if (duplicate == null)
            {
                await _studentImmunizationRepository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }
            return new { code = 400, message = "Duplicate immunization record for the student on the same date is not allowed." };
            
        }
        public async Task UpdateForStudent(StudentImmunization entity)
        {
            await _studentImmunizationRepository.UpdateAsync(entity);
        }

        public async Task DeleteForStudent(Guid id)
        {
            await _studentImmunizationRepository.DeleteAsync(id);
        }

    }
}