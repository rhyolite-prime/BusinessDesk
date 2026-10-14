using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.CutOffs;

public interface ICutOffManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ConductCutOf cutOff); 
    Task Update(ConductCutOf cutOff);
    Task Delete(Guid id);
    
}