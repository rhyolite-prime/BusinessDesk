using Abp.Application.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.Shared.Statuses.Dto;


namespace TopazERP.Services.Shared.Statuses;

public interface IStatusAppService: IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStatusInput input);
    Task Update(UpdateStatusInput input);
    Task Delete(Guid Id);
    
}