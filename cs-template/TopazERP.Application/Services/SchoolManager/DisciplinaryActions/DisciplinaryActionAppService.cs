using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.DisciplinaryActions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.DisciplinaryActions.Dto;

namespace TopazERP.Services.SchoolManager.DisciplinaryActions;

public class DisciplinaryActionAppService: TopazERPAppServiceBase,IDisciplinaryActionAppService
{
    private readonly IDisciplinaryActionManager _disciplinaryActionManager;
    private readonly IMapper _mapper;

    public DisciplinaryActionAppService(IDisciplinaryActionManager disciplinaryActionManager, IMapper mapper)
    {
        _disciplinaryActionManager = disciplinaryActionManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateDisciplinaryActionInput input)
    {
        var entity = _mapper.Map<DisciplinaryAction>(input);
        return await _disciplinaryActionManager.Create(entity);
    }
    public async Task Update(UpdateDisciplinaryActionInput input)
    {
        var entity = _mapper.Map<DisciplinaryAction>(input);
        await _disciplinaryActionManager.Update(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _disciplinaryActionManager.ListAll();
    }
    public async Task Delete(Guid id)
    {
        await _disciplinaryActionManager.Delete(id);
    }
    
    public async Task<IEnumerable<object>> ListAllActions()
    {
        return await _disciplinaryActionManager.ListAllActions();
    }
    public async Task<object> CreateStudentDiscAction(CreateStudentDiscActionInput input)
    {
        var entity = _mapper.Map<StudentDisciplinaryAction>(input);
        return await _disciplinaryActionManager.CreateStudentDiscAction(entity);
    }

    public async Task UpdateStudentDiscAction(UpdateStudentDiscActionInput input)
    {
        var entity = _mapper.Map<StudentDisciplinaryAction>(input);
        await _disciplinaryActionManager.UpdateStudentDiscAction(entity);
    }
    public async Task DeleteStudentDiscAction(Guid id)
    {
        await _disciplinaryActionManager.DeleteStudentDiscAction(id);
    }

}