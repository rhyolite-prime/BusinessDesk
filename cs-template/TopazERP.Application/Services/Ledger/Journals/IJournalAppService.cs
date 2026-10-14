using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ledger.Journals.Dto;
using TopazERP.Services.Ledger.Journals.Dto;

namespace TopazERP.Services.Ledger.Journals;

public interface IJournalAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> GetAsync(Guid id);
    Task Create(CreateJournalInput input);
    Task BatchDelete(List<Guid> ids);
    Task Post(List<Guid> ids);
    Task<object> ListAll(bool isPosted);
    Task Update(UpdateJournalDetailsDto input);
    Task SetupBatchSequence(CreateJournalBatchSequenceInput input);
    Task<object> GetJournalBatchSequence();
    Task<object> GetTransactionsByPeriod(int month, int year);
}