using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;

namespace TopazERP.DomainServices.Payroll.LoanTypes
{
   public class LoanTypeManager: Abp.Domain.Services.DomainService, ILoanTypeManager
    {
        private readonly IRepository<LoanType, Guid> _repositoryLoanType;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;

        public LoanTypeManager(IRepository<LoanType, Guid> repositoryLoanType, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositoryLoanType = repositoryLoanType;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(LoanType entity)
        {
            var datta = await _repositoryLoanType.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryLoanType.InsertAsync(entity);

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

        public async Task Update(LoanType entity)
        {
            await _repositoryLoanType.UpdateAsync(entity);
        }

        public async Task<LoanType> GetAsync(string name)
        {
            return await _repositoryLoanType.FirstOrDefaultAsync(x=> x.Name.ToLower() == name.ToLower().Trim());
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryLoanType.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryLoanType.GetAllListAsync();
            return data.OrderBy(a => a.Name).ToList();

        }
        public async Task<bool> Delete(Guid id)
        {
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "LoanType");
            
            if (hasPassedIntegrity)
            {
                await _repositoryLoanType.DeleteAsync(id);
            }

            return hasPassedIntegrity;
        }
    }
}
