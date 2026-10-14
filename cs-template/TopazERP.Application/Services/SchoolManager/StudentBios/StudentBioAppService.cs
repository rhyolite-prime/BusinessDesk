using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentBios;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentBios.Dto;

namespace TopazERP.Services.SchoolManager.StudentBios;

public class StudentBioAppService : TopazERPAppServiceBase, IStudentBioAppService
{
    private readonly IStudentBioManager _studentBioManager;
    private readonly IMapper _mapper;

    public StudentBioAppService(IStudentBioManager studentBioManager, IMapper mapper)
    {
        _studentBioManager = studentBioManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStudentBioInput input)
    {
        var entity = _mapper.Map<StudentInfo>(input);
        return await _studentBioManager.Create(entity);
    }
    public async Task<object> Import(CreateStudentBioInput input)
    {
        var entity = _mapper.Map<StudentInfo>(input);
        return await _studentBioManager.Create(entity);
    }

    public async Task Update(UpdateStudentBioInput input)
    {
        var entity = _mapper.Map<StudentInfo>(input);
        await _studentBioManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentBioManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _studentBioManager.Delete(id);
    }   
    public async Task<object> GetById(Guid id)
    {
        return await _studentBioManager.GetById(id);
    }

    public async Task<string> GenerateStudentIdAsync()
    {
        return await _studentBioManager.GenerateStudentIdAsync();
    }
    public async Task<string> GenerateIndexNoAsync()
    {
        return await _studentBioManager.GenerateIndexNoAsync();
    }
    
    
}