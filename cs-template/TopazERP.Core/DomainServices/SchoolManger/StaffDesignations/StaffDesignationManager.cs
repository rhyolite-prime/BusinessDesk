using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffDesignations
{
    public class StaffDesignationManager : Abp.Domain.Services.DomainService, IStaffDesignationManager
    {
        private readonly IRepository<StaffDesignation, Guid> _repositoryStaffDesignation;

        public StaffDesignationManager(IRepository<StaffDesignation, Guid> repositoryStaffDesignation)
        {
            _repositoryStaffDesignation = repositoryStaffDesignation;
        }

        public async Task<object> Create(StaffDesignation entity)
        {
            var data = await _repositoryStaffDesignation.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (data == null)
            {
                await _repositoryStaffDesignation.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }
            else
            {
                return new { code = 400, message = "Duplicate records are not allowed." };
            }
        }

        public async Task Update(StaffDesignation entity)
        {
            await _repositoryStaffDesignation.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repositoryStaffDesignation.GetAllListAsync();
            return data.OrderBy(x => x.Name).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repositoryStaffDesignation.DeleteAsync(id);
        }
    }
}