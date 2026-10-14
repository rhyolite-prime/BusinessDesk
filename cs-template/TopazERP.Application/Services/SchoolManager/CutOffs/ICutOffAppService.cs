using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.CutOffs.Dto;

namespace TopazERP.Services.SchoolManager.CutOffs;

public interface ICutOffAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateCutOffInput input); 
    Task Update(UpdateCutOffInput input);
    Task Delete(Guid id);
    
}