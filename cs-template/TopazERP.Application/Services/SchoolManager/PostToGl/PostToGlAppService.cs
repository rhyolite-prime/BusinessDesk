using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.PostToGl;

namespace TopazERP.Services.SchoolManager.PostToGl;

public class PostToGlAppService: TopazERPAppServiceBase,  IPostToGlAppService
{
    private readonly IMapper _mapper;
    private readonly IPostToGlManager _postToGlManager;

    public PostToGlAppService(IMapper mapper, IPostToGlManager postToGlManager)
    {
        _mapper = mapper;
        _postToGlManager = postToGlManager;
    }
    
    public async Task<object> PostBills(List<Guid> billIds)
    {
        return await _postToGlManager.PostBills(billIds);
    }
    
    public async Task<object> PostPayments(List<Guid> paymentIds)
    {
        return await _postToGlManager.PostPayments(paymentIds);
    }
    public async Task<object> PostCreditMemos(List<Guid> memoIds)
    {
        return await _postToGlManager.PostCreditMemos(memoIds);
    }
}