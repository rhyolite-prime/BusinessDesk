using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Journals.Dto;

namespace TopazERP.DomainServices.Ledger.Journals
{
   public interface IJournalManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> GetAsync(Guid id);
        Task Create(Journal input, List<JournalDetail> details);
        Task Update(UpdateJournalDetailsDto input);
        Task BatchDelete(List<Guid> ids);
        Task Post(List<Guid> ids);
        Task SetupBatchSequence(JournalBatchSequence entity);
        Task<object> ListAll(bool isPosted);
        Task<object> RetrieveJournalBatchSequence();
        
        //functions for other modules...
        Task<object> GetTransactions(DateTime startDate, DateTime endDate, string source, bool isMultiCurrency);
        Task<object> GetJournalTransactionsByPeriod(int month, int year);
    }
}
