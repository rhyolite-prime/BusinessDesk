using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentPromotions;

public class StudentPromotionManager:DomainService, IStudentPromotionManager
{
    private readonly IRepository<StudentPromotion, Guid> _studentPromotionRepository;
    private readonly IRepository<PreClassStudentPromotion, Guid> _preClassStudentPromotionRepository;
    private readonly IRepository<StudentInfo, Guid> _studentBioRepository;
    public StudentPromotionManager(IRepository<StudentPromotion, Guid> studentPromotionRepository, IRepository<PreClassStudentPromotion, Guid> preClassStudentPromotionRepository, IRepository<StudentInfo, Guid> studentBioRepository)
    {
        _studentPromotionRepository = studentPromotionRepository;
        _preClassStudentPromotionRepository = preClassStudentPromotionRepository;
        _studentBioRepository = studentBioRepository;
    }
    
    // student promotion
    public async Task<object> Create(StudentPromotion input)
    {
        // Save promotion
        await _studentPromotionRepository.InsertAsync(input);

        // Update student classIds
        if (input.Students != null && input.Students.Any())
        {
            foreach (var promoted in input.Students)
            {
                promoted.PromotionId = input.Id;
                promoted.Id = Guid.NewGuid();
                var student = await _studentBioRepository.FirstOrDefaultAsync(promoted.StudentId);

                if (student != null)
                {
                    student.isAlumni = input.IsAlumni;
                    student.ClassId = promoted.ToClassId;
                    await _studentBioRepository.UpdateAsync(student);
                }
            }
        }

        return new { code = 200, message = "successful" };
    }


    public async Task Update(StudentPromotion input)
    {
        await _studentPromotionRepository.UpdateAsync(input);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _studentPromotionRepository.GetAllListAsync();
        return data.ToList();
    }
    
    public async Task<object> CreatePreClass(PreClassStudentPromotion input)
    {
        await _preClassStudentPromotionRepository.InsertAsync(input);
        // Update student classIds
        if (input.Students != null && input.Students.Any())
        {
            foreach (var promoted in input.Students)
            {
                promoted.PromotionId = input.Id;
                promoted.Id = Guid.NewGuid();
                var student = await _studentBioRepository.FirstOrDefaultAsync(promoted.StudentId);

                if (student != null)
                {
                    student.ClassId = promoted.ToClassId;
                    await _studentBioRepository.UpdateAsync(student);
                }
            }
        }
        return new { code = 200, message = "successful" };
    }
    public async Task UpdatePreClass(PreClassStudentPromotion input)
    {
        await _preClassStudentPromotionRepository.UpdateAsync(input);
    }
   
    public async Task<IEnumerable<object>> ListAllPreClass()
    {
        var data = await _preClassStudentPromotionRepository.GetAllListAsync();
        return data.ToList();
    }
    
}