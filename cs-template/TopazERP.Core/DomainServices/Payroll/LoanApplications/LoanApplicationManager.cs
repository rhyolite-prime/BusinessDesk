using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.LoanApplications
{
   public class LoanApplicationManager: Abp.Domain.Services.DomainService, ILoanApplicationManager
    {
        private readonly IRepository<LoanApplication, Guid> _repositoryLoanApplication;

        public LoanApplicationManager(IRepository<LoanApplication, Guid> repositoryLoanApplication)
        {
            _repositoryLoanApplication = repositoryLoanApplication;
        }

        public async Task Create(LoanApplication entity)
        {
            await _repositoryLoanApplication.InsertAsync(entity);
        }

        public async Task Update(LoanApplication entity)
        {
            await _repositoryLoanApplication.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryLoanApplication.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryLoanApplication.GetAllListAsync();
            return data.OrderByDescending(a => a.CreationTime).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryLoanApplication.DeleteAsync(id);

        }
    }
}
