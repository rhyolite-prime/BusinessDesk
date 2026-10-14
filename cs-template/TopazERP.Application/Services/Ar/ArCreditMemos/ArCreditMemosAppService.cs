using System.Threading.Tasks;
using Abp;
using Abp.Domain.Repositories;
using AutoMapper;
using TopazERP.DomainServices.Ar.ArCreditMemos;
using TopazERP.Models.Ar;
using TopazERP.Services.Ap.DebitMemo.Dto;
using TopazERP.Services.Ar.ArCreditMemos.Dto;

namespace TopazERP.Services.Ar.ArCreditMemos;

public class ArCreditMemosAppService: AbpServiceBase, IArCreditMemosAppService
{
    private readonly IArCreditMemosManager _arCreditMemosManager;
    private readonly IMapper _mapper;

    public ArCreditMemosAppService(IArCreditMemosManager arCreditMemosManager, IMapper mapper)
    {
        _arCreditMemosManager = arCreditMemosManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateArCreditMemoInput input)
    {
        var obj = _mapper.Map<ArCreditMemo>(input);
        return await _arCreditMemosManager.Create(obj);
    }
    
    public async Task<object> Apply(UpdateArCreditMemoInput input)
    {
        var obj = _mapper.Map<ArCreditMemo>(input);
        return await _arCreditMemosManager.Apply(obj);
    }
    
    public async Task<object> Update(UpdateArCreditMemoInput input)
    {
        var obj = _mapper.Map<ArCreditMemo>(input);
        return await _arCreditMemosManager.Update(obj);
    }

    public async Task<object> ListAll()
    {
        return await _arCreditMemosManager.ListAll();
    }
    
    public async Task<string> GenerateBatchNumberAsync()
    {
        return await _arCreditMemosManager.GenerateBatchNumberAsync();
    }
    
    public async Task<object> Delete(System.Guid id)
    {
        return await _arCreditMemosManager.Delete(id);
    }
    
}