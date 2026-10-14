using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.NurseryGradings;

public interface INurseryGradingManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(NurseryGrading nurseryGrading);
    Task Update(NurseryGrading nurseryGrading);
    Task Delete(Guid id);
    
}