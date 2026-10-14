using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SchoolProfiles;

public interface ISchoolProfileManager : Abp.Domain.Services.IDomainService
{
    Task<object> GetProfile();
    Task Create(SchoolProfile input);
    Task Update(SchoolProfile input);
    //get currentAcademicyearid and name from profile
    Task<(string, string, string, string)> GetCurrentAcademicYear();
}