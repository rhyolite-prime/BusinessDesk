using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffPastEmployments
{
    public class StaffPastEmploymentManager : Abp.Domain.Services.DomainService, IStaffPastEmploymentManager
    {
        private readonly IRepository<StaffPastEmployment, Guid> _repository;

        public StaffPastEmploymentManager(IRepository<StaffPastEmployment, Guid> repository)
        {
            _repository = repository;
        }

        public async Task<object> Create(StaffPastEmployment entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x =>
                x.CompanyName == entity.CompanyName &&
                x.StaffId == entity.StaffId);

            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate employment record not allowed." };
        }

        public async Task Update(StaffPastEmployment entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.CompanyName).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}