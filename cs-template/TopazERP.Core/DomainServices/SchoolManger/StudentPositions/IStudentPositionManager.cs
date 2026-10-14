using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentPositions
{
    public interface IStudentPositionManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(Position studentPosition);
        Task Update(Position studentPosition);
        Task Delete(Guid id);
        
        // student specific methods
        Task<IEnumerable<object>> ListByStudentId(Guid studentId);
        Task<object> CreateForStudent(StudentPosition studentPosition);
        Task UpdateForStudent(StudentPosition studentPosition);
        Task DeleteForStudent(Guid studentPositionId);
        
        // get all student positions
        Task<IEnumerable<object>> GetAllStudentPositions();
    }
}