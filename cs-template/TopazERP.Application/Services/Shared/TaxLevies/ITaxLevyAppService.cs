using Abp.Application.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.Shared.TaxLevies.Dto;

namespace TopazERP.Services.Shared.TaxLevies;

public interface ITaxLevyAppService: IApplicationService
{
    Task<object> ListAll(string type);
    Task Create(CreateTaxLevyInput input);
    Task Update(UpdateTaxLevyInput input);
    Task Delete(Guid Id);
}