using Abp.Domain.Repositories;
using System;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Imprests
{
    public class ImprestWriteoffManager : Abp.Domain.Services.DomainService, IImprestWriteoffManager
    {
        private readonly IRepository<ImprestWriteoff, Guid> _repository;

        public ImprestWriteoffManager(IRepository<ImprestWriteoff, Guid> repository)
        {
            _repository = repository;
        }

        public async Task Create(ImprestWriteoff entity)
        {
            await _repository.InsertAsync(entity);
        }

        public async Task Update(ImprestWriteoff entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repository.FirstOrDefaultAsync(id);
        }
        
        public async Task<object> GetEmployeeImprestWriteOffs(Guid id)
        {
            return await _repository.GetAllListAsync(x => x.EmployeeId == id);
        }

        public async Task<object> ListAll()
        {
            return await _repository.GetAllListAsync();
        }
        
        

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}
