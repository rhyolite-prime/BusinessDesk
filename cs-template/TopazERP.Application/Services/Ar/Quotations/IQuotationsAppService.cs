using System;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.Ar.Quotations.Dto;


namespace TopazERP.Services.Ar.Quotations;

public interface IQuotationsAppService: IApplicationService
{
    Task<object> ListAll();
    Task<object> GetAsync(string customerName);
    Task<object> Create(CreateQuotationsInput input);
    Task<object> Update(UpdateQuotaionsInput input);
    Task<object> Delete(Guid id);
}