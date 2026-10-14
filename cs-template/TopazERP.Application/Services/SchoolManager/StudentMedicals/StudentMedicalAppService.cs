using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentMedicals;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentMedicals.Dto;
using TopazERP.Services.SchoolManager.StudentPositions;

namespace TopazERP.Services.SchoolManager.StudentMedicals;

public class StudentMedicalAppService: TopazERPAppServiceBase, IStudentMedicalAppService
{
    private readonly IStudentMedicalManager _studentMedicalManager;
    private readonly IMapper _mapper;

    public StudentMedicalAppService(IStudentMedicalManager studentMedicalManager, IMapper mapper)
    {
        _studentMedicalManager = studentMedicalManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateStudentMedicalInput input)
    {
        var entity = _mapper.Map<StudentMedical>(input);
        return await _studentMedicalManager.Create(entity);
    }

    public async Task Update(UpdateStudentMedicalInput input)
    {
        var entity = _mapper.Map<StudentMedical>(input);
        await _studentMedicalManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
    {
        return await _studentMedicalManager.ListByStudentId(studentId);
    }

    public async Task Delete(Guid id)
    {
        await _studentMedicalManager.Delete(id);
    }
    
}