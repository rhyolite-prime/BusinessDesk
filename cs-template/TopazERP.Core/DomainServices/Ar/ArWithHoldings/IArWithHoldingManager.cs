using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Ar;


namespace TopazERP.DomainServices.Ar.ArWithHoldings;

public interface IArWithHoldingManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll();
    Task<object> PostWithHoldings(List<Guid> withHoldingIds);
    Task<object> Create(ArWithholdingPayment input);
    Task<ArWithholdingPayment> GetAsync(string CustomerName);
    Task Update(ArWithholdingPayment input);
    Task Delete(Guid Id);
    Task<string> GenerateBatchNumberAsync();
}