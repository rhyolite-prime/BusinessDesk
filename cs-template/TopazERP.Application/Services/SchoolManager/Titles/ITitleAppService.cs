using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Titles.Dto;

namespace TopazERP.Services.SchoolManager.Titles;

public interface ITitleAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateTitleInput input);
    Task Update(UpdateTitleInput input);
    Task Delete(Guid id);
}