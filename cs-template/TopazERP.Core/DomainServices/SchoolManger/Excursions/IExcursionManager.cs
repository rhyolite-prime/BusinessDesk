using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Excursions;

public interface IExcursionManager: IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(Excursion excursion); 
    Task Update(Excursion excursion);
    Task Delete(Guid id);
}