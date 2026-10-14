using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentImmunizations;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentImmunizations.Dto;

namespace TopazERP.Services.SchoolManager.StudentImmunizations;

public class StudentImmunizationAppService : TopazERPAppServiceBase, IStudentImmunizationAppService
{
    private readonly IStudentImmunizationManager _studentImmunizationManager;
    private readonly IMapper _mapper;

    public StudentImmunizationAppService(IStudentImmunizationManager studentImmunizationManager, IMapper mapper)
    {
        _studentImmunizationManager = studentImmunizationManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateImmunizationInput input)
    {
        var entity = _mapper.Map<ImmunizationType>(input);
        return await _studentImmunizationManager.Create(entity);
    }

    public async Task Update(UpdateImmunizationInput input)
    {
        var entity = _mapper.Map<ImmunizationType>(input);
        await _studentImmunizationManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentImmunizationManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _studentImmunizationManager.Delete(id);
    }
    public async Task<IEnumerable<object>> ListAllForStudent(Guid studentId)
    {
        return await _studentImmunizationManager.ListAllByStudentId(studentId);
    }
    public async Task<object> CreateForStudent(CreateStudentImmunizationInput input)
    {
        var entity = _mapper.Map<StudentImmunization>(input);
        return await _studentImmunizationManager.CreateForStudent(entity);
    }
    public async Task UpdateForStudent(UpdateStudentImmunizationInput input)
    {
        var entity = _mapper.Map<StudentImmunization>(input);
        await _studentImmunizationManager.UpdateForStudent(entity);
    }
    public async Task DeleteForStudent(Guid id)
    {
        await _studentImmunizationManager.DeleteForStudent(id);
    }
}