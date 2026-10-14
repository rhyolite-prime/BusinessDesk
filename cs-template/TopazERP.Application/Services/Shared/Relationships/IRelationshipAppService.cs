using Abp.Application.Services;
using TopazERP.Services.Shared.Relationships.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Relationships
{
   public interface IRelationshipAppService : IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateRelationshipInput input);
        Task Update(UpdateRelationshipInput input);
        Task Delete(Guid Id);
    }
}
