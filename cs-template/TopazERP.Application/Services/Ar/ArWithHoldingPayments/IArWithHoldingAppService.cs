using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Ar;
using TopazERP.Services.Ar.ArWithHoldingPayments.Dto;


namespace TopazERP.Services.Ar.ArWithHoldingPayments;

public interface IArWithHoldingAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateArWithHoldingInput input);
    Task<ArWithholdingPayment> GetAsync(string CustomerName);
    Task Update(UpdateArWithHoldingInput input);
    Task Delete(Guid Id);
    
    Task<object> PostWithHoldings(List<Guid> withHoldingIds);
    Task<string> GenerateBatchNumberAsync();
}