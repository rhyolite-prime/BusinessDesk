using TopazERP.DomainServices.Ap.ApVouchers.Dto;
using TopazERP.Services.Ap.ApVouchers.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ap.ApVouchers;

public interface IApVoucherAppService: Abp.Application.Services.IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateApVoucherInput input);
    Task Update(UpdateApVoucherInput input);
    Task Delete(Guid Id);
    Task<object> DeleteMultiple(List<Guid> ids);
    Task<object> PostVouchers(List<Guid> voucherIds);
    Task<string> GenerateBatchNumberAsync();
    
}
