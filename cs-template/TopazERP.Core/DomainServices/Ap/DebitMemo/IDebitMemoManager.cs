using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ap;
namespace TopazERP.DomainServices.Ap.DebitMemo;

public interface IDebitMemoManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll();
    Task<object> Create(ApDebitMemo input);
    Task<object> Apply(ApDebitMemo input);
    Task<object> Delete(Guid id);
    Task<object> Update(ApDebitMemo input);
    
    Task<ApDebitMemo> GetAsync(string SupplierName);
    Task<string> GenerateBatchNumberAsync();
}