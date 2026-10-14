using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StContactRelationships
{
    public class StContactRelationshipManager : Abp.Domain.Services.DomainService, IStContactRelationshipManager
    {
        private readonly IRepository<StContactRelationship, Guid> _repository;

        public StContactRelationshipManager(IRepository<StContactRelationship, Guid> repository)
        {
            _repository = repository;
        }

        public async Task<object> Create(StContactRelationship entity)
        {
           
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
          
        }

        public async Task Update(StContactRelationship entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.FirstName).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}