using System;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.Vouchers;

public interface IPettyCashManager : IDomainService
{
    Task<object> Create(PettyCashTransaction input);
    Task Update(PettyCashTransaction input);
    Task Delete(Guid id);
    Task<object> GetDetails(Guid id);
    Task<object> ListAll(DateTime? startDate, DateTime? endDate);
    Task PostPettyCash(PostVoucherDto dto);
    Task DeleteProposedJournal(Guid proposedJournalHeaderId, System.Collections.Generic.List<Guid> proposedJournalDetailIdList);
}
