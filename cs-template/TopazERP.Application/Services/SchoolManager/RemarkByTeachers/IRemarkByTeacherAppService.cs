using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.RemarkByTeachers.Dto;

namespace TopazERP.Services.SchoolManager.RemarkByTeachers;

/// <summary>
/// 
/// </summary>
public interface IRemarkByTeacherAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ImportRemarksDto input);
    Task Update(UpdateRemarksInput input);
    
}