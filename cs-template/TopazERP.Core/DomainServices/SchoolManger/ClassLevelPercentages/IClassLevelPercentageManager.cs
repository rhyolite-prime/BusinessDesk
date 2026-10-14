using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassLevelPercentages;

public interface IClassLevelPercentageManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ClassLevelPercentage percentage);
    Task Update(ClassLevelPercentage percentage);
    Task Delete(Guid id);
}