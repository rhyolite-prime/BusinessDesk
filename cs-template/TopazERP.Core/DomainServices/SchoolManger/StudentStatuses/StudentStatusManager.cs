using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentStatuses;

public class StudentStatusManager: Abp.Domain.Services.DomainService, IStudentStatusManager
{
    private  readonly IRepository<StudentStatus, Guid> _repository;

    public StudentStatusManager(IRepository<StudentStatus, Guid> repository)
    {
        _repository = repository;
    }
    
    public async Task<object> Create(StudentStatus entity)
    {
        var duplicate = await _repository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());
        if (duplicate == null)
        {
            await _repository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }

        return new { code = 400, message = "Duplicate status not allowed." };
    }
    public async Task Update(StudentStatus entity)
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
}