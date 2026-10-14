using System;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.Shared.PersonnelStatus.Dto;

namespace TopazERP.Services.Shared.PersonnelStatuses;

public interface IPersonnelStatusAppService : IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreatePersonnelStatusInput entity);
    Task Update(UpdatePersonnelStatusInput entity);
    Task<bool> Delete(Guid Id);
}