using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeOnetimeDeductions
{
   public class EmployeeOnetimeDeductionManager: Abp.Domain.Services.DomainService, IEmployeeOnetimeDeductionManager
    {
        private readonly IRepository<EmployeeOnetimeDeduction, Guid> _repositoryEmployeeOnetimeDeduction;

        public EmployeeOnetimeDeductionManager(IRepository<EmployeeOnetimeDeduction, Guid> repositoryEmployeeOnetimeDeductionAllowanceType)
        {
            _repositoryEmployeeOnetimeDeduction = repositoryEmployeeOnetimeDeductionAllowanceType;
        }

        public async Task Create(EmployeeOnetimeDeduction entity)
        {
            await _repositoryEmployeeOnetimeDeduction.InsertAsync(entity);
        }

        public async Task Update(EmployeeOnetimeDeduction entity)
        {
            await _repositoryEmployeeOnetimeDeduction.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeOnetimeDeduction.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeOnetimeDeduction.GetAllListAsync();
            return data.OrderBy(a => a.EmployeeName).ToList();
        }
        
        

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeOnetimeDeduction.GetAllListAsync(x=> x.EmployeeId == employeeId);
        }

        public async Task<object> ListAll(int month,int year)
        {
            return await _repositoryEmployeeOnetimeDeduction.GetAllListAsync(x => x.Month == month && x.Year == year);
        }

        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeOnetimeDeduction.DeleteAsync(id);
        }
    }
}
