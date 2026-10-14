using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.StudentPromotions.Dto;


namespace TopazERP.Services.SchoolManager.StudentPromotions;

public interface IStudentPromotionAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStudentPromotionInput input);
    Task Update(UpdateStudentPromotionInput input);
    
    //pre class
    Task<IEnumerable<object>> ListAllPreClass();
    Task<object> CreatePreClass(CreatePreClassPromotionInput input);
    Task UpdatePreClass(UpdatePreClassPromotionInput input);
}