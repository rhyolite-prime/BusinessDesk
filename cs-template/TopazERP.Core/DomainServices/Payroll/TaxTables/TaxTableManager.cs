using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.TaxTables
{
   public class TaxTableManager: Abp.Domain.Services.DomainService, ITaxTableManager
    {
        private readonly IRepository<TaxTable, Guid> _repositoryTaxTable;

        public TaxTableManager(IRepository<TaxTable, Guid> repositoryTaxTable)
        {
            _repositoryTaxTable = repositoryTaxTable;
        }

        public async Task Create(TaxTable entity)
        {
            await _repositoryTaxTable.InsertAsync(entity);
        }

        public async Task Update(TaxTable entity)
        {
            await _repositoryTaxTable.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryTaxTable.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data =  await _repositoryTaxTable.GetAllListAsync();

            return data.OrderBy(a=> a.Rate);
        }
        public async Task Delete(Guid id)
        {
            await _repositoryTaxTable.DeleteAsync(id);

        }
    }
}
