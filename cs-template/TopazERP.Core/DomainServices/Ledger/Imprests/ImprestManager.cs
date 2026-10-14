using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.Imprests
{
   public class ImprestManager : Abp.Domain.Services.DomainService, IImprestManager
    {
        private readonly IRepository<Imprest, Guid> _repositoryImprest;

        public ImprestManager(IRepository<Imprest, Guid> repositoryImprest)
        {
            _repositoryImprest = repositoryImprest;
        }

        public async Task Create(Imprest entity)
        {
            await _repositoryImprest.InsertAsync(entity);
        }

        public async Task Update(Imprest entity)
        {
            await _repositoryImprest.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryImprest.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryImprest.GetAllListAsync();
        }

        public async Task<object> GetEmployeeImprests(Guid employeeId)
        {
            return await _repositoryImprest.GetAllListAsync(a=> a.EmployeeId == employeeId);
        }
        public async Task Delete(Guid id)
        {
            await _repositoryImprest.DeleteAsync(id);
        }
    }
}
