using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StContactRelationships
{
    public interface IStContactRelationshipManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StContactRelationship stContactRelationship);
        Task Update(StContactRelationship stContactRelationship);
        Task Delete(Guid id);
    }
}