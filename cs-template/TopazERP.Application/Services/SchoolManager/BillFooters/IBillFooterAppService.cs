using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.BillFooters.Dto;

namespace TopazERP.Services.SchoolManager.BillFooters;

public interface IBillFooterAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateBillFooterInput input);
    Task Update(UpdateBillFooterInput input);
    Task Delete(Guid id);
}