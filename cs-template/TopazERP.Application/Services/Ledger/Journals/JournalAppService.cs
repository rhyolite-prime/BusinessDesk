using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Journals;
using TopazERP.DomainServices.Ledger.Journals.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Journals.Dto;

namespace TopazERP.Services.Ledger.Journals;

public class JournalAppService: TopazERPAppServiceBase, IJournalAppService
{
    private readonly IJournalManager _journalManager;
    private readonly IMapper _mapper;

    public JournalAppService(IJournalManager journalManager, IMapper mapper)
    {
        _journalManager = journalManager;
        _mapper = mapper;
    }
    
    public async Task Create(CreateJournalInput input)
    {
        var obj = _mapper.Map<Journal>(input);
        
        //transform journal details here
        List<JournalDetail> details = new List<JournalDetail>();
        
        foreach (var detail in input.JournalDetails)
        {
            detail.BatchDate = input.BatchDate;
            detail.BatchNumber = input.BatchNumber;
            
            details.Add(_mapper.Map<JournalDetail>(detail));
        }
        
        
        await _journalManager.Create(obj, details);
    }

    public async Task<object> GetAsync(Guid id)
    {
        return await _journalManager.GetAsync(id);
    }

    public async Task<object> ListAll()
    {
        return await _journalManager.ListAll();
    }

    public async Task<object> GetTransactionsByPeriod(int month, int year)
    {
        return await _journalManager.GetJournalTransactionsByPeriod(month, year);
    }

    public async Task<object> ListAll(bool isPosted)
    {
        return await _journalManager.ListAll(isPosted);
    }

    public async Task BatchDelete(List<Guid> Ids)
    {
        await _journalManager.BatchDelete(Ids);
    }
    
    public async Task Post(List<Guid> ids)
    {
        await _journalManager.Post(ids);
    }

    public async Task Update(UpdateJournalDetailsDto input)
    {
        await _journalManager.Update(input);
    }
    
    public async Task SetupBatchSequence(CreateJournalBatchSequenceInput input)
    {
        var obj = _mapper.Map<JournalBatchSequence>(input);
        await _journalManager.SetupBatchSequence(obj);
    }
    
    public async Task<object> GetJournalBatchSequence()
    {
        return await _journalManager.RetrieveJournalBatchSequence();
    }
}