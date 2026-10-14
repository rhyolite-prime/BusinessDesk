using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Payroll.TaxTableHistories;

namespace TopazERP.Services.Payroll.TaxTableHistories
{
    public class TaxTableHistoryAppService: TopazERPAppServiceBase, ITaxTableHistoryAppService
    {
        private readonly ITaxTableHistoryManager _taxTableHistoryManager;

        public TaxTableHistoryAppService(ITaxTableHistoryManager taxTableHistoryManager)
        {
            _taxTableHistoryManager = taxTableHistoryManager;
        }

        public async Task<object> ListAll()
        {
            return await _taxTableHistoryManager.ListAll();
        }
        public async Task Create(string title)
        {
            await _taxTableHistoryManager.Create(title);
        }

        public async Task Restore(Guid Id)
        {
            await _taxTableHistoryManager.Restore(Id);
        }
        public async Task Delete(Guid Id)
        {
            await _taxTableHistoryManager.Delete(Id);

        }

    }
}
