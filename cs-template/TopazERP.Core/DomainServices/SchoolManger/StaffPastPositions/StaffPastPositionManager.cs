using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffPastPositions
{
    public class StaffPastPositionManager : Abp.Domain.Services.DomainService, IStaffPastPositionManager
    {
        private readonly IRepository<StaffPastPosition, Guid> _repository;

        public StaffPastPositionManager(IRepository<StaffPastPosition, Guid> repository)
        {
            _repository = repository;
        }

        public async Task<object> Create(StaffPastPosition entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x =>
                x.StaffId == entity.StaffId &&
                x.DesignationId == entity.DesignationId &&
                x.StartDate == entity.StartDate);

            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate record not allowed." };
        }

        public async Task Update(StaffPastPosition entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.StartDate).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}