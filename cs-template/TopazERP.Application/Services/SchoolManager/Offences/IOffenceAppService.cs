using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Offences.Dto;

namespace TopazERP.Services.SchoolManager.Offences;

public interface IOffenceAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateOffenceInput input);
    Task Update(UpdateOffenceInput input);
    Task Delete(Guid id);
}