using Abp.Domain.Entities;
using Abp.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Payroll;

namespace TopazERP.DomainServices.Payroll.TaxTableHistories
{
    public class TaxTableHistoryManager: Abp.Domain.Services.DomainService, ITaxTableHistoryManager
    {

        private readonly IRepository<TaxTable, Guid> _repositoryTaxTable;
        private readonly IRepository<TaxTableHistory, Guid> _repositoryTaxTableHistory;

        public TaxTableHistoryManager(IRepository<TaxTable, Guid> repositoryTaxTable, IRepository<TaxTableHistory, Guid> repositoryTaxTableHistory)
        {
            _repositoryTaxTable = repositoryTaxTable;
            _repositoryTaxTableHistory = repositoryTaxTableHistory;
        }

        public async Task<object> ListAll()
        {
            return await _repositoryTaxTableHistory.GetAllListAsync();

        }

        public async Task Create(string title)
        {
            var taxTable = await _repositoryTaxTable.GetAllListAsync();

            var taxTableHistory = new TaxTableHistory
            {
                Title = title,
                TaxTableList = taxTable,
            };

            await _repositoryTaxTableHistory.InsertAsync(taxTableHistory);

        }


        public async Task Restore(Guid id)
        {

            var data = await _repositoryTaxTableHistory.FirstOrDefaultAsync(id);

            if (data != null)
            {
                var currentTaxTableList = await _repositoryTaxTable.GetAllListAsync();

                foreach (var currentTaxTable in currentTaxTableList)
                {
                    await _repositoryTaxTable.DeleteAsync(currentTaxTable.Id);
                }


                foreach (var taxTable in data.TaxTableList)
                {
                    taxTable.Id = Guid.NewGuid();
                    await _repositoryTaxTable.InsertAsync(taxTable);
                }

            }

        }

        public async Task Delete(Guid id)
        {
            await _repositoryTaxTableHistory.DeleteAsync(id);
        }

    }
}
