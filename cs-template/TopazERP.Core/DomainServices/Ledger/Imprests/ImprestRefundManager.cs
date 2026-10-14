using Abp.Domain.Repositories;
using System;
using System.Threading.Tasks;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Imprests
{
    public class ImprestRefundManager : Abp.Domain.Services.DomainService, IImprestRefundManager
    {
        private readonly IRepository<ImprestRefund, Guid> _repository;

        public ImprestRefundManager(IRepository<ImprestRefund, Guid> repository)
        {
            _repository = repository;
        }

        public async Task Create(ImprestRefund entity)
        {
            await _repository.InsertAsync(entity);
        }

        public async Task Update(ImprestRefund entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repository.FirstOrDefaultAsync(id);
        }
        
        public async Task<object> GetEmployeeImprestRefunds(Guid id)
        {
            return await _repository.GetAllListAsync(x=> x.EmployeeId == id);
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
