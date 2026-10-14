using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffRelationships
{
    public class StaffRelationshipManager : Abp.Domain.Services.DomainService, IStaffRelationshipManager
    {
        private readonly IRepository<StaffRelationship, Guid> _repository;

        public StaffRelationshipManager(IRepository<StaffRelationship, Guid> repository)
        {
            _repository = repository;
        }

        public async Task<object> Create(StaffRelationship entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x =>
                x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() && x.StaffId == entity.StaffId);

            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate relationship not allowed." };
        }

        public async Task Update(StaffRelationship entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.Name).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}