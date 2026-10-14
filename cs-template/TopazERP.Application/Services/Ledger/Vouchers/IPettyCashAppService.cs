using System;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Services.Ledger.Vouchers.Dto;

namespace TopazERP.Services.Ledger.Vouchers;

public interface IPettyCashAppService : IApplicationService
{
    Task<object> Create(CreatePettyCashTransactionInput input);
    Task Update(UpdatePettyCashTransactionInput input);
    Task Delete(Guid id);
    Task<object> GetDetails(Guid id);
    Task<object> ListAll(DateTime? startDate, DateTime? endDate);
    Task PostPettyCash(PostVoucherDto dto);
}
