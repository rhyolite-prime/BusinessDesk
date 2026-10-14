using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.CategoryPercentages.Dto;

namespace TopazERP.Services.SchoolManager.CategoryPercentages;

public interface ICategoryPercentageAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateCategoryPercentageInput input);
    Task Update(UpdateCategoryPercentageInput input);
    Task Delete(Guid id);
}