using AutoMapper;
using TopazERP.DomainServices.Shared.Relationships;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.Relationships.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Relationships
{
   public class RelationshipAppService: TopazERPAppServiceBase, IRelationshipAppService
    {
        private readonly IRelationshipManager _relationshipManager;
        private readonly IMapper _mapper;

        public RelationshipAppService(IRelationshipManager relationshipManager, IMapper mapper)
        {
            _relationshipManager = relationshipManager;
            _mapper = mapper;
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _relationshipManager.ListAll();
        }

        public async Task<object> Create(CreateRelationshipInput input)
        {
            var obj = _mapper.Map<Relationship>(input);
            return await _relationshipManager.Create(obj);
        }

        public async Task Update(UpdateRelationshipInput input)
        {
            var obj = _mapper.Map<Relationship>(input);
            await _relationshipManager.Update(obj);
        }

        public async Task Delete(Guid Id)
        {
            await _relationshipManager.Delete(Id);

        }
    }
}
