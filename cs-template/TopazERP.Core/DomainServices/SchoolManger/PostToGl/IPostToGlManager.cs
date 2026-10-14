using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;

namespace TopazERP.DomainServices.SchoolManger.PostToGl;

public interface IPostToGlManager:IDomainService
{
    Task<object> PostBills(List<Guid> billIds);
    Task<object> PostPayments(List<Guid> paymentIds);
    Task<object> PostCreditMemos(List<Guid> memoIds);
}