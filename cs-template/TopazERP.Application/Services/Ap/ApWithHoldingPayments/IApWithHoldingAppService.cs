using TopazERP.Services.Ap.ApWithHoldingPayments.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ap;

namespace TopazERP.Services.Ap.ApWithHoldingPayments;

public interface IApWithHoldingAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateApWithHoldingInput input);
    Task<ApWithHoldingPayment> GetAsync(string SupplierName);
    Task Update(UpdateApWithHoldingInput input);
    Task Delete(Guid Id);
    
    Task<object> PostWithHoldings(List<Guid> withHoldingIds);
    Task<string> GenerateBatchNumberAsync();
    
}
