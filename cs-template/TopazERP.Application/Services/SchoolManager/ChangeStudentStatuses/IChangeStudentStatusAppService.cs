using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.ChangeStudentStatuses.Dto;

namespace TopazERP.Services.SchoolManager.ChangeStudentStatuses;

public interface IChangeStudentStatusAppService: Abp.Application.Services.IApplicationService
{
    Task<object> Create(CreateChangeStudentStatusInput input);
    Task Update(UpdateChangeStudentStatusInput input);
    
}