using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

namespace TopazERP.DomainServices.Payroll.EmployeeCategories
{
   public class EmployeeCategoryManager: Abp.Domain.Services.DomainService, IEmployeeCategoryManager
    {
        private readonly IRepository<EmployeeCategory, Guid> _repositoryEmployeeCategory;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;

        public EmployeeCategoryManager(IRepository<EmployeeCategory, Guid> repositoryEmployeeCategory, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositoryEmployeeCategory = repositoryEmployeeCategory;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(EmployeeCategory entity)
        {
            var datta = await _repositoryEmployeeCategory.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryEmployeeCategory.InsertAsync(entity);

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

        public async Task Update(EmployeeCategory entity)
        {
            await _repositoryEmployeeCategory.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeCategory.FirstOrDefaultAsync(id);
        }

        public async Task<EmployeeCategory> GetAsync(string name)
        {
            return await _repositoryEmployeeCategory.FirstOrDefaultAsync(x=> x.Name == name);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeCategory.GetAllListAsync();

            return data.OrderBy(a => a.Name);

        }
        public async Task<bool> Delete(Guid id)
        {
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "EmployeeCategory");
            
            if (hasPassedIntegrity)
            {
                await _repositoryEmployeeCategory.DeleteAsync(id);
            }

            return hasPassedIntegrity;

        }
    }
}
