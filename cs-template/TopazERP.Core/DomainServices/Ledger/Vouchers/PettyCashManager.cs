using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Linq.Expressions;
using TopazERP.DomainServices.Ledger.Vouchers.Dto;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;
using TopazERP.Utils;

namespace TopazERP.DomainServices.Ledger.Vouchers;

public class PettyCashManager: Abp.Domain.Services.DomainService, IPettyCashManager
{
    private readonly IRepository<PettyCashTransaction, Guid> _repositoryPettyCash;
    private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;
    private readonly IRepository<Journal, Guid> _repositoryJournal;
    private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;

    public PettyCashManager(
        IRepository<PettyCashTransaction, Guid> repositoryPettyCash, 
        IRepository<SystemNumber, Guid> repositorySystemNumber, 
        IRepository<JournalDetail, Guid> repositoryJournalDetail, 
        IRepository<Journal, Guid> repositoryJournal)
    {
        _repositoryPettyCash = repositoryPettyCash;
        _repositorySystemNumber = repositorySystemNumber;
        _repositoryJournalDetail = repositoryJournalDetail;
        _repositoryJournal = repositoryJournal;
    }
    
    public async Task<object> Create(PettyCashTransaction input)
    {
        var savedVoucher = await _repositoryPettyCash.InsertAsync(input);
        
        //update system number ...
        var voucherBatchSystemNumber = await _repositorySystemNumber.FirstOrDefaultAsync(x=> x.ItemName == "GL-PettyCashNumbers" && x.ModuleName == "General Ledger");

        if (voucherBatchSystemNumber != null)
        {
            voucherBatchSystemNumber.LastNo += 1;
            await _repositorySystemNumber.UpdateAsync(voucherBatchSystemNumber);
        }

        return savedVoucher;
    }

    public async Task Update(PettyCashTransaction input)
    {
        await _repositoryPettyCash.UpdateAsync(input);
    }

    public async Task Delete(Guid id)
    {
        var transactionInfo = await _repositoryPettyCash.FirstOrDefaultAsync(id);
        
        var proposedJournalHeader = await _repositoryJournal.FirstOrDefaultAsync(x => x.BatchNumber == transactionInfo.BatchNo);

        if (proposedJournalHeader != null)
        {
            await _repositoryJournal.DeleteAsync(proposedJournalHeader.Id);
        
            var proposedJournalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == proposedJournalHeader.Id);

            foreach (var journalDetail in proposedJournalDetails)
            {
                await _repositoryJournalDetail.DeleteAsync(journalDetail.Id);
            }
        }
        await _repositoryPettyCash.DeleteAsync(id);
    }

    public async Task<object> GetDetails(Guid id)
    {
        var transactionInfo = await _repositoryPettyCash.FirstOrDefaultAsync(id);
        
        var proposedJournalHeader = await _repositoryJournal.FirstOrDefaultAsync(x => x.BatchNumber == transactionInfo.BatchNo);
        var proposedJournalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == proposedJournalHeader.Id);

        return new 
        {
            transactionInfo,
            proposedJournalHeader,
            proposedJournalDetails
        };
    }

    public async Task<object> ListAll(DateTime? startDate, DateTime? endDate)
    {
        var predicate = PredicateBuilder.New<PettyCashTransaction>(x => !x.IsDeleted);
        predicate.And(x => !x.IsPosted);
        
        if (startDate.HasValue)
        {
            predicate = predicate.And(x => x.BatchDate >= startDate.Value);
        }
    
        if (endDate.HasValue)
        {
            predicate = predicate.And(x => x.BatchDate <= endDate.Value);
        }
    
        var result = await _repositoryPettyCash.GetAllListAsync(predicate);
        
        return result.Select(x => new 
        {
            x.Id,
            x.BatchNo, 
            x.BatchDate,
            x.PettyCashAccountName,
            x.CurrencyName,
            x.TotalAmount,
            x.BatchOriginator
        }).ToList();
    }

    public async Task PostPettyCash(PostVoucherDto dto)
    {
        foreach (var voucherId in dto.Ids)
        {
            var transactionInfo = await _repositoryPettyCash.FirstOrDefaultAsync(voucherId);
            var proposedJournalHeader = await _repositoryJournal.FirstOrDefaultAsync(x => x.BatchNumber == transactionInfo.BatchNo);
            
            proposedJournalHeader.IsTemporary = false;
            proposedJournalHeader.IsPosted = false;
            await _repositoryJournal.UpdateAsync(proposedJournalHeader);
            
            var proposedJournalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == proposedJournalHeader.Id);

            foreach (var journalDetail in proposedJournalDetails)
            {
                journalDetail.IsPosted = true;
                await _repositoryJournalDetail.UpdateAsync(journalDetail);
            }
            
            transactionInfo.IsPosted = true;
            await _repositoryPettyCash.UpdateAsync(transactionInfo);
        }
    }

    public async Task DeleteProposedJournal(Guid proposedJournalHeaderId, List<Guid> proposedJournalDetailIdList)
    {
        foreach (var id in proposedJournalDetailIdList)
        {
            await _repositoryJournalDetail.DeleteAsync(id);
        }
        await _repositoryJournal.DeleteAsync(proposedJournalHeaderId);
    }
}
