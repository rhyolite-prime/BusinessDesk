using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.DisciplinaryActions;

public class DisciplinaryActionManager: Abp.Domain.Services.DomainService,IDisciplinaryActionManager
{
    private readonly IRepository<DisciplinaryAction, Guid> _repositoryDisciplinaryAction;
    private readonly IRepository<StudentDisciplinaryAction, Guid> _repositoryStudentDisciplinaryAction;

    public DisciplinaryActionManager(IRepository<DisciplinaryAction, Guid> repositoryDisciplinaryAction, IRepository<StudentDisciplinaryAction, Guid> repositoryStudentDisciplinaryAction)
    {
        _repositoryDisciplinaryAction = repositoryDisciplinaryAction;
        _repositoryStudentDisciplinaryAction = repositoryStudentDisciplinaryAction;
    }
    
    public async Task<object> Create(DisciplinaryAction entity)
    {
        var datta = await _repositoryDisciplinaryAction.FirstOrDefaultAsync(x => x.ActionDescription.Trim().ToLower() == entity.ActionDescription.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryDisciplinaryAction.InsertAsync(entity);

            return new
            {
                code = 200,
                message = "successful"
            };
        }
        else
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }
    }
    public async Task Update(DisciplinaryAction entity)
    {
        await _repositoryDisciplinaryAction.UpdateAsync(entity);
    }

    public async Task<object> GetAsync(Guid id)
    {
        return await _repositoryDisciplinaryAction.GetAsync(id);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryDisciplinaryAction.GetAllListAsync();
        return data.OrderBy(data => data.ActionDescription).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryDisciplinaryAction.DeleteAsync(id);

    }
    
    //assign
    public async Task<IEnumerable<object>> ListAllActions()
    {
        var data = await _repositoryStudentDisciplinaryAction.GetAllListAsync();
        return data.OrderBy(data => data.AcademicYearName).ToList();
    }
    public async Task<object> CreateStudentDiscAction(StudentDisciplinaryAction entity)
    {
        await _repositoryStudentDisciplinaryAction.InsertAsync(entity);

        return new
        {
            code = 200,
            message = "successful"
        };
    }

    public async Task UpdateStudentDiscAction(StudentDisciplinaryAction entity)
    {
        await _repositoryStudentDisciplinaryAction.UpdateAsync(entity);
    }
    public async Task DeleteStudentDiscAction(Guid id)
    {
        await _repositoryStudentDisciplinaryAction.DeleteAsync(id);
    }

}