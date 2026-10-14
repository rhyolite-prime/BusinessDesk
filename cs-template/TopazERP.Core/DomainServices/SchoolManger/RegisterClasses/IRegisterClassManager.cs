using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.RegisterClasses;

public interface IRegisterClassManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(RegisteredClass registeredClass);
    Task Update(RegisteredClass registeredClass);
    Task Delete(Guid id);
    
}