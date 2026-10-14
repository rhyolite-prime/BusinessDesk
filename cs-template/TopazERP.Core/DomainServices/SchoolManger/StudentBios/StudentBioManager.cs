using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.UI;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.StudentBios;

public class StudentBioManager : Abp.Domain.Services.DomainService, IStudentBioManager
{
    private readonly IRepository<StudentInfo, Guid> _studentBioRepository;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    public StudentBioManager(IRepository<StudentInfo, Guid> studentBioRepository, IRepository<SystemNumber, Guid> repositorySystemNumber)
    {
        _studentBioRepository = studentBioRepository;
        _repositorySystemNumber = repositorySystemNumber;
    }
    
    public async Task<object> Create(StudentInfo entity)
    {
        var duplicate = await _studentBioRepository.FirstOrDefaultAsync(x => x.StudentIdentifier == entity.StudentIdentifier);
        if (duplicate == null)
        {
            if (string.IsNullOrWhiteSpace(entity.StudentIdentifier) || entity.StudentIdentifier.Trim() == "0")
            {
                entity.StudentIdentifier = await GenerateStudentIdAsync();
            }

            if (string.IsNullOrWhiteSpace(entity.IndexNumber) || entity.IndexNumber.Trim() == "0")
            {
                entity.IndexNumber = await GenerateIndexNoAsync();
            }
            
            await _studentBioRepository.InsertAsync(entity);
            return new { code = 200, message = "successful", id =  entity.Id };
        }
        return new { code = 400, message = "Duplicate student identifier not allowed." };
    }
    public async Task<object> Import(StudentInfo entity)
    {
        var duplicate = await _studentBioRepository.FirstOrDefaultAsync(x => x.StudentIdentifier == entity.StudentIdentifier);
        if (duplicate == null)
        {
            await _studentBioRepository.InsertAsync(entity);
            return new { code = 200, message = "successful", id =  entity.Id };
        }
        return new { code = 400, message = "Duplicate student identifier not allowed." };
    }
    public async Task Update(StudentInfo entity)
    {
        await _studentBioRepository.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _studentBioRepository.GetAllListAsync();
        return data.OrderBy(x => x.StudentIdentifier).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _studentBioRepository.DeleteAsync(id);
    }
    
    public async Task<object> GetById(Guid id)
    {
        return await _studentBioRepository.GetAsync(id);
    }

    /*public async Task<string> GenerateStudentIdAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers.FirstOrDefault(sn => sn.ItemName == "SM-StudentID");

        if (systemNumber == null)
        {
            throw new UserFriendlyException(
                "Please set up Student ID (SM-StudentID) in System Numbers."
            );
        }

        string studentId;
        bool isDuplicate;

        do
        {
            studentId = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";
            
            isDuplicate = await _studentBioRepository.CountAsync(x => x.StudentIdentifier == studentId) > 0;

            if (isDuplicate)
            {
                systemNumber.LastNo += 1;
            }
        } while (isDuplicate);

        // Update the system number in the database
        systemNumber.LastNo += 1;
        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return studentId;
    }
    public async Task<string> GenerateIndexNoAsync()
    {
        var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
        var systemNumber = systemNumbers.FirstOrDefault(sn => sn.ItemName == "SM-IndexNo");

        if (systemNumber == null)
        {
            throw new UserFriendlyException(
                "Please set up Student Index Number (SM-IndexNo) in System Numbers."
            );
        }

        string studentId;
        bool isDuplicate;

        do
        {
            studentId = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";
            
            isDuplicate = await _studentBioRepository.CountAsync(x => x.IndexNumber == studentId) > 0;

            if (isDuplicate)
            {
                systemNumber.LastNo += 1;
            }
        } while (isDuplicate);

        // Update the system number in the database
        systemNumber.LastNo += 1;
        await _repositorySystemNumber.UpdateAsync(systemNumber);

        return studentId;
    }*/
    public async Task<string> GenerateStudentIdAsync()
    {
        var systemNumber = await _repositorySystemNumber.FirstOrDefaultAsync(sn => sn.ItemName == "SM-StudentID");
        if (systemNumber == null)
            throw new UserFriendlyException("Please set up Student ID (SM-StudentID) in System Numbers.");

        while (true)
        {
            var studentId = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            var exists = await _studentBioRepository.CountAsync(x => x.StudentIdentifier == studentId) > 0;

            systemNumber.LastNo += 1; // move forward for next number
            await _repositorySystemNumber.UpdateAsync(systemNumber);

            if (!exists)
                return studentId;
        }
    }

    public async Task<string> GenerateIndexNoAsync()
    {
        var systemNumber = await _repositorySystemNumber.FirstOrDefaultAsync(sn => sn.ItemName == "SM-IndexNo");
        if (systemNumber == null)
            throw new UserFriendlyException("Please set up Student Index Number (SM-IndexNo) in System Numbers.");

        while (true)
        {
            var indexNo = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";

            var exists = await _studentBioRepository.CountAsync(x => x.IndexNumber == indexNo) > 0;

            systemNumber.LastNo += 1;
            await _repositorySystemNumber.UpdateAsync(systemNumber);

            if (!exists)
                return indexNo;
        }
    }
}