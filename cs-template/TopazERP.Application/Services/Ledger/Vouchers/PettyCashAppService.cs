using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Vouchers;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Vouchers.Dto;

namespace TopazERP.Services.Ledger.Vouchers;

public class PettyCashAppService: TopazERPAppServiceBase, IPettyCashAppService
{
    private readonly IPettyCashManager _pettyCashManager;
    private readonly IMapper _mapper;
    
    public PettyCashAppService(IPettyCashManager pettyCashManager, IMapper mapper)
    {
        _pettyCashManager = pettyCashManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreatePettyCashTransactionInput input)
    {
        var tenantInfo = await GetCurrentTenantAsync();
        var obj = _mapper.Map<PettyCashTransaction>(input);
        obj.TenantId = tenantInfo.Id;
        return await _pettyCashManager.Create(obj);
    }

    public async Task Update(UpdatePettyCashTransactionInput input)
    {
        var tenantInfo = await GetCurrentTenantAsync();
        var obj = _mapper.Map<PettyCashTransaction>(input);
        obj.TenantId = tenantInfo.Id;
        await _pettyCashManager.Update(obj);
        
        await _pettyCashManager.DeleteProposedJournal(input.ProposedJournalHeaderId, input.ProposedJournalDetailIdList);
    }

    public async Task Delete(Guid id)
    {
        await _pettyCashManager.Delete(id);
    }

    public async Task<object> GetDetails(Guid id)
    {
        return await _pettyCashManager.GetDetails(id);
    }

    public async Task<object> ListAll(DateTime? startDate, DateTime? endDate)
    {
        return await _pettyCashManager.ListAll(startDate, endDate);
    }

    public async Task PostPettyCash(PostVoucherDto dto)
    {
        await _pettyCashManager.PostPettyCash(dto);
    }
}
