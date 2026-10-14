using AutoMapper;
using TopazERP.DomainServices.Ap.DebitMemo;
using TopazERP.Models.Ap;
using TopazERP.Services.Ap.DebitMemo.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
namespace TopazERP.Services.Ap.DebitMemo;

public class DebitMemoAppService: TopazERPAppServiceBase, IDebitMemoAppService
{
    private readonly IDebitMemoManager _debitMemoManager;
    private readonly IMapper _mapper;

    public DebitMemoAppService(IDebitMemoManager debitMemoManager, IMapper mapper)
    {
        _debitMemoManager = debitMemoManager;
        _mapper = mapper;
    }

    public async Task<object> ListAll()
    {
        return await _debitMemoManager.ListAll();
    }

    public async Task<object> Create(CreateDebitMemoInput input)
    {
        var obj = _mapper.Map<ApDebitMemo>(input);
        return await _debitMemoManager.Create(obj);
    }
    
    public async Task<object> Apply(UpdateDebitMemoInput input)
    {
        var obj = _mapper.Map<ApDebitMemo>(input);
        return await _debitMemoManager.Apply(obj);
    }
    public async Task<object> Delete(Guid id)
    {
        return await _debitMemoManager.Delete(id);
    }
    public async Task<object> Update(UpdateDebitMemoInput input)
    {
        var obj = _mapper.Map<ApDebitMemo>(input);
        return await _debitMemoManager.Update(obj);
    }
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _debitMemoManager.GenerateBatchNumberAsync();
    }
    
}
