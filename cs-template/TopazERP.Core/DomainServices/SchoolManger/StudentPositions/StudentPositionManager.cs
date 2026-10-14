using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentPositions
{
    public class StudentPositionManager : Abp.Domain.Services.DomainService, IStudentPositionManager
    {
        private readonly IRepository<Position, Guid> _repository;
        private readonly IRepository<StudentPosition, Guid> _studentPositionRepository;

        public StudentPositionManager(IRepository<Position, Guid> repository, IRepository<StudentPosition, Guid> studentPositionRepository)
        {
            _repository = repository;
            _studentPositionRepository = studentPositionRepository;
        }

        public async Task<object> Create(Position entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate position not allowed." };
        }

        public async Task Update(Position entity)
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
        
        // student specific methods
        public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
        {
            var data = await _studentPositionRepository.GetAllListAsync(x => x.StudentId == studentId);
            return data.OrderBy(x => x.PositionName).ToList();
        }
        
        public async Task<object> CreateForStudent(StudentPosition entity)
        {
            var duplicate = await _studentPositionRepository.FirstOrDefaultAsync(x => x.StudentId == entity.StudentId && x.PositionName == entity.PositionName);
            if (duplicate == null)
            {
                await _studentPositionRepository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate position for student not allowed." };
        }
        public async Task UpdateForStudent(StudentPosition entity)
        {
            await _studentPositionRepository.UpdateAsync(entity);
        }
        public async Task DeleteForStudent(Guid studentPositionId)
        {
            await _studentPositionRepository.DeleteAsync(studentPositionId);
        }
        
        //// get all student position
        public async Task<IEnumerable<object>> GetAllStudentPositions()
        {
            var data = await _studentPositionRepository.GetAllListAsync();
            return data.OrderBy(x => x.PositionName).ToList();
        }   
    }
}