using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.CreditMemos;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.CreditMemos.Dto;
using TopazERP.Services.SchoolManager.Payments.Dto;

namespace TopazERP.Services.SchoolManager.CreditMemos;

public class CreditMemoAppService: TopazERPAppServiceBase, ICreditMemoAppService
{
    private readonly ICreditMemoManager _memoManager;
    private readonly IMapper _mapper;

    public CreditMemoAppService(ICreditMemoManager memoManager, IMapper mapper)
    {
        _memoManager = memoManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateSchMemoInput input)
    {
        var entity = _mapper.Map<SchCreditMemo>(input);
        await _memoManager.Create(entity);
        return new { code = 200, message = "successful" };
        
    }
    public async Task<object> CreateMultiple(List<CreateSchMemoInput> inputs)
    {
        if (inputs == null || !inputs.Any())
            return new { code = 400, message = "No data provided" };

        foreach (var input in inputs)
        {
            var entity = _mapper.Map<SchCreditMemo>(input);
            await _memoManager.Create(entity);
        }

        return new { code = 200, message = "successful" };
    }

    public async Task Update(UpdateSchMemoInput input)
    {
        var entity = _mapper.Map<SchCreditMemo>(input);
        await _memoManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _memoManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _memoManager.Delete(id);
    }
    public async Task<object> CancelMemos(List<Guid> memoIds)
    {
        return await _memoManager.CancelMemos(memoIds);
    }
}