using System;
using System.Threading.Tasks;
using TopazERP.Services.Ar.ArCreditMemos.Dto;

namespace TopazERP.Services.Ar.ArCreditMemos;

public interface IArCreditMemosAppService: Abp.Application.Services.IApplicationService
{
    Task<object> Create(CreateArCreditMemoInput input);
    Task<object> ListAll();
    Task<object> Apply(UpdateArCreditMemoInput input);
    
    Task<object> Update(UpdateArCreditMemoInput input);
    
    Task<string> GenerateBatchNumberAsync();
    Task<object> Delete(Guid id);
    
}