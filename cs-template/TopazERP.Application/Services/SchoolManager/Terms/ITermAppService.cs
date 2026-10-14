using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Terms.Dto;

namespace TopazERP.Services.SchoolManager.Terms;

public interface ITermAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateTermInput term); 
    Task Update(UpdateTermInput term);
    Task Delete(Guid id);
    
}