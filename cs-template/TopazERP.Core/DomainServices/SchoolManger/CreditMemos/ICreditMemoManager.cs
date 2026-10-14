using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.CreditMemos;

public interface ICreditMemoManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(SchCreditMemo memo);
    Task<object> CreateMultiple(List<SchCreditMemo> entities);
    Task Update(SchCreditMemo memo);
    Task Delete(Guid id);
    Task<object> CancelMemos(List<Guid> memoIds);
}