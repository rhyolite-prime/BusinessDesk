using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeDeductions
{
   public class EmployeeDeductionManager: Abp.Domain.Services.DomainService, IEmployeeDeductionManager
    {
        private readonly IRepository<EmployeeDeduction, Guid> _repositoryEmployeeDeduction;

        public EmployeeDeductionManager(IRepository<EmployeeDeduction, Guid> repositoryEmployeeDeduction)
        {
            _repositoryEmployeeDeduction = repositoryEmployeeDeduction;
        }

        public async Task<object> Create(EmployeeDeduction entity)
        {
            var data = await _repositoryEmployeeDeduction.FirstOrDefaultAsync(x=>x.EmployeeId == entity.EmployeeId && x.DeductionTypeId == entity.DeductionTypeId);

            if (data == null)
            {
                await _repositoryEmployeeDeduction.InsertAsync(entity);
                return new
                {
                    code = 200,
                    message = "successful"
                };
            }
            else
            {
                return new
                {
                    code = 400,
                    message = "Duplicate records are not allowed."
                };

            }

        }

        public async Task Update(EmployeeDeduction entity)
        {
            await _repositoryEmployeeDeduction.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeDeduction.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeDeduction.GetAllListAsync();

            return data.OrderBy(a => a.EmployeeName).ToList();
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeDeduction.GetAllListAsync(x=>x.EmployeeId == employeeId);
        }

        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeDeduction.DeleteAsync(id);

        }
    }
}
