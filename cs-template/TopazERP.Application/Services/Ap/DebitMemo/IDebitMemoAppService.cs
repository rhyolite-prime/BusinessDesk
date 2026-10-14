using TopazERP.Services.Ap.DebitMemo.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace TopazERP.Services.Ap.DebitMemo;

public interface IDebitMemoAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateDebitMemoInput input);
    Task<object> Apply(UpdateDebitMemoInput input);
    Task<object> Delete(Guid id);
    Task<object> Update(UpdateDebitMemoInput input);
    Task<string> GenerateBatchNumberAsync();
}