using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Ar;

namespace TopazERP.DomainServices.Ar.ArCreditMemos;

public interface IArCreditMemosManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll();
    Task<object> Create(ArCreditMemo input);
    Task<object> Apply(ArCreditMemo input);
  //  Task<object> Post(List<Guid> creditMemoIds);
    
    Task<object> Update(ArCreditMemo input);
    Task<ArCreditMemo> GetAsync(string CustomerName);
    Task<string> GenerateBatchNumberAsync();
    Task<object> Delete(Guid id);
}