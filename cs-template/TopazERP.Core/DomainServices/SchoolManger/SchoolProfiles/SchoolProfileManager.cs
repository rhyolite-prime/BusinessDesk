using System;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.SchoolProfiles;

public class SchoolProfileManager: Abp.Domain.Services.DomainService, ISchoolProfileManager
{
    private readonly IRepository<SchoolProfile, Guid> _repositorySchoolProfile;
    private readonly IRepository<AcademicYear, Guid> _repositoryAcademicYear;
    public SchoolProfileManager(IRepository<SchoolProfile, Guid> repositorySchoolProfile, IRepository<AcademicYear, Guid> repositoryAcademicYear)
    {
        _repositorySchoolProfile = repositorySchoolProfile;
        _repositoryAcademicYear = repositoryAcademicYear;
    }
    
    public async Task Create(SchoolProfile entity)
    {
        await _repositorySchoolProfile.InsertAsync(entity);
        
    }

    public async Task<object> GetProfile()
    {
        return await _repositorySchoolProfile.GetAll().FirstOrDefaultAsync();
    }

    public async Task Update(SchoolProfile entity)
    {
        await _repositorySchoolProfile.UpdateAsync(entity);
        
    }
    
    public async Task<(string, string, string, string)> GetCurrentAcademicYear()
    {
        var profile = await _repositorySchoolProfile.GetAll().FirstOrDefaultAsync();
        if (profile == null)
        {
            return (null, null, null, null);
        }
        var academicYear = await _repositoryAcademicYear.GetAll().FirstOrDefaultAsync(x => x.Id == profile.CurrentAcademicYearId);

        return (profile.CurrentAcademicYearId.ToString(), academicYear.Name, profile.CurrentTermId.ToString(), profile.CurrentTermName);
    }
}