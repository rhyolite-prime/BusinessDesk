using Abp.Domain.Repositories;
using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Imprests
{
    public class ImprestRetirementManager : Abp.Domain.Services.DomainService, IImprestRetirementManager
    {
        private readonly IRepository<ImprestRetirement, Guid> _repository;
        private readonly IRepository<ImprestRetirementDetail, Guid> _detailRepository;

        public ImprestRetirementManager(
            IRepository<ImprestRetirement, Guid> repository,
            IRepository<ImprestRetirementDetail, Guid> detailRepository)
        {
            _repository = repository;
            _detailRepository = detailRepository;
        }

        public async Task Create(ImprestRetirement entity, List<ImprestRetirementDetail> details)
        {
            var retirementId = await _repository.InsertAndGetIdAsync(entity);
            if (details != null)
            {
                foreach (var detail in details)
                {
                    detail.ImprestRetirementId = retirementId;
                    await _detailRepository.InsertAsync(detail);
                }
            }
        }

        public async Task Update(ImprestRetirement entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repository.FirstOrDefaultAsync(id);
        }
        
        public async Task<object> GetEmployeeImprestRetirements(Guid id)
        {
            return await _repository.GetAllListAsync(a=> a.EmployeeId == id);
        }

        public async Task<object> ListAll()
        {
            return await _repository.GetAllListAsync();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
            await _detailRepository.DeleteAsync(x => x.ImprestRetirementId == id);
        }
    }
}
