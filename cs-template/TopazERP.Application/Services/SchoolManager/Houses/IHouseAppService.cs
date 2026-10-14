using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Houses.Dto;

namespace TopazERP.Services.SchoolManager.Houses;

public interface IHouseAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateHouseInput input);
    Task Update(UpdateHouseInput input);
    Task Delete(Guid id);
}