using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;

namespace TopazERP.Services.SchoolManager.PostToGl;

public interface IPostToGlAppService:IApplicationService
{
    Task<object> PostBills(List<Guid> billIds);
    Task<object> PostPayments(List<Guid> paymentIds);
    Task<object> PostCreditMemos(List<Guid> memoIds);
    
}