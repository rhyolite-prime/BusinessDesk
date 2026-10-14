using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Hostels.Dto;

namespace TopazERP.Services.SchoolManager.Hostels;

public interface IHostelAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateHostelInput input); 
    Task Update(UpdateHostelInput input);
    Task Delete(Guid id);
    
}