using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.ImprestCategories
{
   public class ImprestCategoryManager : Abp.Domain.Services.DomainService, IImprestCategoryManager
    {
        private readonly IRepository<ImprestCategory, Guid> _repositoryImprestCategory;

        public ImprestCategoryManager(IRepository<ImprestCategory, Guid> repositoryImprestCategory)
        {
            _repositoryImprestCategory = repositoryImprestCategory;
        }

        public async Task<object> Create(ImprestCategory entity)
        {
            var datta = await _repositoryImprestCategory.FirstOrDefaultAsync(x => x.Name == entity.Name);

            if (datta == null)
            {
                await _repositoryImprestCategory.InsertAsync(entity);

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

        public async Task Update(ImprestCategory entity)
        {
            await _repositoryImprestCategory.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryImprestCategory.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryImprestCategory.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryImprestCategory.DeleteAsync(id);

        }

    }
}
