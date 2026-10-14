using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeAllowances
{
   public class EmployeeAllowanceManager : Abp.Domain.Services.DomainService, IEmployeeAllowanceManager
    {
        private readonly IRepository<EmployeeAllowance, Guid> _repositoryEmployeeAllowance;

        public EmployeeAllowanceManager(IRepository<EmployeeAllowance, Guid> repositoryEmployeeAllowance)
        {
            _repositoryEmployeeAllowance = repositoryEmployeeAllowance;
        }

        public async Task<object> Create(EmployeeAllowance entity)
        {
            var data = await _repositoryEmployeeAllowance.FirstOrDefaultAsync(x=> x.EmployeeId == entity.EmployeeId && x.AllowanceTypeId == entity.AllowanceTypeId);
            
            if (data == null)
            {
                await _repositoryEmployeeAllowance.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "successful"
                };

            }

            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };


        }

        public async Task Update(EmployeeAllowance entity)
        {
            await _repositoryEmployeeAllowance.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeAllowance.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryEmployeeAllowance.GetAllListAsync();

        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeAllowance.GetAllListAsync(x=> x.EmployeeId == employeeId);
        }
        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeAllowance.DeleteAsync(id);

        }
    }
}
