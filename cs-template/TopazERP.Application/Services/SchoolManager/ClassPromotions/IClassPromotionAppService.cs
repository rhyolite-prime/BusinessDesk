using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.ClassPromotions.Dto;

namespace TopazERP.Services.SchoolManager.ClassPromotions;

public interface IClassPromotionAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateClassPromotionInput promotion);
    Task Update (UpdateClassPromotionInput promotion);
}