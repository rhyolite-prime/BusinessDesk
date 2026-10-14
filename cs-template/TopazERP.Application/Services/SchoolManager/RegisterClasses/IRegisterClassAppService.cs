using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.RegisterClasses.Dto;

namespace TopazERP.Services.SchoolManager.RegisterClasses;

public interface IRegisterClassAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateRegisterClassInput input);
    Task Update(UpdateRegisterClassInput input);
    Task Delete(Guid id);
    
}