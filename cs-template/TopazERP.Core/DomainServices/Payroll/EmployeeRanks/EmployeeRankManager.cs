using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

namespace TopazERP.DomainServices.Payroll.EmployeeRanks
{
   public class EmployeeRankManager: Abp.Domain.Services.DomainService, IEmployeeRankManager
    {
        private readonly IRepository<EmployeeRank, Guid> _repositoryEmployeeRank;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;

        public EmployeeRankManager(IRepository<EmployeeRank, Guid> repositoryEmployeeRank, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositoryEmployeeRank = repositoryEmployeeRank;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(EmployeeRank entity)
        {
            var datta = await _repositoryEmployeeRank.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryEmployeeRank.InsertAsync(entity);

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

        public async Task Update(EmployeeRank entity)
        {
            await _repositoryEmployeeRank.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeRank.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeRank.GetAllListAsync();
            return data.OrderBy(a => a.Name).ToList();

        }
        public async Task<bool> Delete(Guid id)
        {
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "EmployeeRank");
            
            if (hasPassedIntegrity)
            {
                await _repositoryEmployeeRank.DeleteAsync(id);
            }

            return hasPassedIntegrity;

        }
    }
}
