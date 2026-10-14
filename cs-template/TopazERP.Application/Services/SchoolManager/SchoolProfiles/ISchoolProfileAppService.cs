using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.SchoolProfiles.Dto;

namespace TopazERP.Services.SchoolManager.SchoolProfiles;

public interface ISchoolProfileAppService: Abp.Application.Services.IApplicationService
{
    Task<object> GetProfile();
    Task Create(CreateSchoolProfileInput input);
    Task Update(UpdateSchoolProfileInput input);
    //get currentAcademicyearid and name from profile
    Task<(string, string, string, string)> GetCurrentAcademicYear();
}