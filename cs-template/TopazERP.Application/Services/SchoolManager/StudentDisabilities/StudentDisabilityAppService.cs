using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentDisabilities;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentDisabilities.Dto;

namespace TopazERP.Services.SchoolManager.StudentDisabilities;

public class StudentDisabilityAppService : TopazERPAppServiceBase, IStudentDisabilityAppService
{
    private readonly IStudentDisabilityManager _studentDisabilityManager;
    private readonly IMapper _mapper;

    public StudentDisabilityAppService(IStudentDisabilityManager studentDisabilityManager, IMapper mapper)
    {
        _studentDisabilityManager = studentDisabilityManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateDisabilityInput input)
    {
        var entity = _mapper.Map<Disability>(input);
        return await _studentDisabilityManager.Create(entity);
    }

    public async Task Update(UpdateDisabilityInput input)
    {
        var entity = _mapper.Map<Disability>(input);
        await _studentDisabilityManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentDisabilityManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _studentDisabilityManager.Delete(id);
    }
    public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
    {
        return await _studentDisabilityManager.ListByStudentId(studentId);
    }
    public async Task<object> CreateForStudent(CreateStudentDisabilityInput input)
    {
        var entity = _mapper.Map<StudentDisability>(input);
        return await _studentDisabilityManager.CreateForStudent(entity);
    }
    public async Task UpdateForStudent(UpdateStudentDisabilityInput input)
    {
        var entity = _mapper.Map<StudentDisability>(input);
        await _studentDisabilityManager.UpdateForStudent(entity);
    }

    public async Task DeleteForStudent(Guid id)
    {
        await _studentDisabilityManager.DeleteForStudent(id);
    }
}