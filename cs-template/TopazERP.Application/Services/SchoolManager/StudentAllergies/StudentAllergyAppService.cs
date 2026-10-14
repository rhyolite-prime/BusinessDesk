using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentAllergies;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentAllergies.Dto;

namespace TopazERP.Services.SchoolManager.StudentAllergies;

public class StudentAllergyAppService : TopazERPAppServiceBase, IStudentAllergyAppService
{
    private readonly IStudentAllergyManager _studentAllergyManager;
    private readonly IMapper _mapper;

    public StudentAllergyAppService(IStudentAllergyManager studentAllergyManager, IMapper mapper)
    {
        _studentAllergyManager = studentAllergyManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateAllergyInput input)
    {
        var entity = _mapper.Map<AllergyType>(input);
        return await _studentAllergyManager.Create(entity);
    }

    public async Task Update(UpdateAllergyInput input)
    {
        var entity = _mapper.Map<AllergyType>(input);
        await _studentAllergyManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentAllergyManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _studentAllergyManager.Delete(id);
    }
    public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
    {
        return await _studentAllergyManager.ListByStudentId(studentId);
    }
    public async Task<object> CreateStudentAllergy(CreateStudentAllergyInput input)
    {
        var entity = _mapper.Map<StudentAllergy>(input);
        return await _studentAllergyManager.CreateStudentAllergy(entity);
    }
    public async Task UpdateStudentAllergy(UpdateStudentAllergyInput input)
    {
        var entity = _mapper.Map<StudentAllergy>(input);
        await _studentAllergyManager.UpdateStudentAllergy(entity);
    }

    public async Task DeleteStudentAllergy(Guid id)
    {
        await _studentAllergyManager.DeleteStudentAllergy(id);
    }
}