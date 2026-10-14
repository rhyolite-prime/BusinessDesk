using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.FeesDescriptions;

public interface IFeesDescriptionManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(FeesDescription feesDescription); 
    Task Update(FeesDescription feesDescription);
    Task Delete(Guid id);
}