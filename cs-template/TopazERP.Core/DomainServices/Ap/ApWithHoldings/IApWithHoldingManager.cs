using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ap;
namespace TopazERP.DomainServices.Ap.ApWithHoldings;

public interface IApWithHoldingManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll();
    Task<object> PostWithHoldings(List<Guid> withHoldingIds);
    Task<object> Create(ApWithHoldingPayment input);
    Task<ApWithHoldingPayment> GetAsync(string SupplierName);
    Task Update(ApWithHoldingPayment input);
    Task Delete(Guid Id);
    Task<string> GenerateBatchNumberAsync();
    
}