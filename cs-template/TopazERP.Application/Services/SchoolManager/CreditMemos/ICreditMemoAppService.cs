using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.CreditMemos.Dto;

namespace TopazERP.Services.SchoolManager.CreditMemos;

public interface ICreditMemoAppService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateSchMemoInput memo);
    Task<object> CreateMultiple(List<CreateSchMemoInput> entities);
    Task Update(UpdateSchMemoInput memo);
    Task Delete(Guid id);
    Task<object> CancelMemos(List<Guid> memoIds);
}