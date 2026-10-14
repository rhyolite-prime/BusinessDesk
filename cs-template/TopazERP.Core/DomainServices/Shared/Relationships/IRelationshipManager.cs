using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Relationships
{
   public interface IRelationshipManager: Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(Relationship input);
        Task Update(Relationship input);
        Task Delete(Guid Id);
    }
}
