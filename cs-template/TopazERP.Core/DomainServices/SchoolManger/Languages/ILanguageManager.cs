using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Languages;

public interface ILanguageManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(SmLanguage language); 
    Task Update(SmLanguage language);
    Task Delete(Guid id);
    
}
