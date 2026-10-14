using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Languages.Dto;

namespace TopazERP.Services.SchoolManager.Languages;

public interface ILanguageAppService : Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateLanguageInput input);
    Task Update(UpdateLanguageInput input);
    Task Delete(Guid id);
}