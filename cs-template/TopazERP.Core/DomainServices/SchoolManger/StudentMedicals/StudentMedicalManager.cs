using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.SchoolManger.StudentMedicals;

public class StudentMedicalManager: Abp.Domain.Services.DomainService, IStudentMedicalManager
{
    private readonly Abp.Domain.Repositories.IRepository<Models.Sch.StudentMedical, Guid> _studentMedicalRepository;

    public StudentMedicalManager(Abp.Domain.Repositories.IRepository<Models.Sch.StudentMedical, Guid> studentMedicalRepository)
    {
        _studentMedicalRepository = studentMedicalRepository;
    }

    public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
    {
        var data = await _studentMedicalRepository.GetAllListAsync(x => x.StudentId == studentId);
        return data.OrderBy(x => x.DoctorName).ToList();
    }

    public async Task<object> Create(Models.Sch.StudentMedical studentMedical)
    {
        await _studentMedicalRepository.InsertAsync(studentMedical);
        return new { code = 200, message = "successful" };
    }

    public async Task Update(Models.Sch.StudentMedical studentMedical)
    {
        await _studentMedicalRepository.UpdateAsync(studentMedical);
    }

    public async Task Delete(Guid id)
    {
        await _studentMedicalRepository.DeleteAsync(id);
    }   
}