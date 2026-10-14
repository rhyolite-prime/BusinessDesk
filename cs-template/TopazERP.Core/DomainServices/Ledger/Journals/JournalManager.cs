using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TopazERP.DomainServices.Ledger.Journals.Dto;
using TopazERP.Models.Shared;
using TopazERP.RabbitMq;

namespace TopazERP.DomainServices.Ledger.Journals
{
   public class JournalManager : Abp.Domain.Services.DomainService, IJournalManager
    {
        private readonly IRepository<Journal, Guid> _repositoryJournal;
        private readonly IRepository<Currency, Guid> _repositoryCurrency;
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
        private readonly IRepository<JournalDetail, Guid> _repositoryJournalDetail;
        private readonly IRepository<JournalBatchSequence, Guid> _repositoryJournalBatchSequence;
        public JournalManager(IRepository<Journal, Guid> repositoryJournal, IRepository<JournalBatchSequence, Guid> repositoryJournalBatchSequence, IRepository<JournalDetail, Guid> repositoryJournalDetail, IRepository<Currency, Guid> repositoryCurrency, IRepository<CompanyProfile, Guid> repositoryCompanyProfile)
        {
            _repositoryJournal = repositoryJournal;
            _repositoryJournalBatchSequence = repositoryJournalBatchSequence;
            _repositoryJournalDetail = repositoryJournalDetail;
            _repositoryCurrency = repositoryCurrency;
            _repositoryCompanyProfile = repositoryCompanyProfile;
        }

        public async Task Create(Journal entity, List<JournalDetail> details)
        {
            var journalId = Guid.NewGuid();
            
            if (entity.BatchDate == default(DateTime))
            {
                entity.BatchDate = DateTime.UtcNow;
            }
            
            entity.Id = journalId;
            await _repositoryJournal.InsertAsync(entity);

            Guid defaultCurrencyId = Guid.Empty;
            string defaultCurrencyCode = string.Empty;
            string defaultCurrencyName =  string.Empty;
            decimal defaultCurrencyBuyRate = 0m;
            decimal defaultCurrencySellRate = 0m;
            var companyProfile = await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
            
            if (companyProfile != null)
            {
                var defaultCurrency = await _repositoryCurrency.FirstOrDefaultAsync(a=> a.Id == companyProfile.DefaultCurrenyId);
                defaultCurrencyId =  defaultCurrency.Id;
                defaultCurrencyName = defaultCurrency.CurrencyName;
                defaultCurrencyBuyRate = defaultCurrency.BuyRate;
                defaultCurrencySellRate = defaultCurrency.SellRate;
                defaultCurrencyCode = defaultCurrency.CurrencyCode;
            }
            
            if (details != null)
            {
                var isMultiCurrency = details.Where(d => d.CurrencyId != Guid.Empty)
                    .Select(d => d.CurrencyId)
                    .Distinct()
                    .Count() > 1;
                
                foreach (var detail in details)
                {
                    //if there's no currency, set it to the default currency
                    if (detail.CurrencyId == Guid.Empty)
                    {
                        detail.CurrencyId = defaultCurrencyId;
                        detail.CurrencyName = defaultCurrencyName;
                        detail.BuyRate = defaultCurrencyBuyRate;
                        detail.SellRate = defaultCurrencySellRate;
                        detail.CurrencyCode = defaultCurrencyCode;
                        
                    }
                    //set standard account type
                    detail.StandardAccountType = 0;
                    detail.JournalId = journalId;
                    detail.IsMultiCurrency = isMultiCurrency;
                    detail.TransactionDate = entity.BatchDate;
                    await _repositoryJournalDetail.InsertAsync(detail);
                }
            }
            
            //increase the next batch number
            var sequence = await _repositoryJournalBatchSequence.GetAll().FirstOrDefaultAsync();
            if (sequence != null)
            {
                sequence.CurrentBatchNumber = sequence.NextBatchNumber;
                sequence.NextBatchNumber += sequence.SequenceIncrement;
                await _repositoryJournalBatchSequence.UpdateAsync(sequence);
            }
            
        }
        
        public async Task SetupBatchSequence(JournalBatchSequence entity)
        {
            var existing = await _repositoryJournalBatchSequence.GetAll().FirstOrDefaultAsync();
            
            if (existing != null)
            {
                existing.Prefix = string.IsNullOrEmpty(entity.Prefix) ? string.Empty : entity.Prefix;
                existing.Suffix = string.IsNullOrEmpty(entity.Suffix) ? string.Empty : entity.Suffix;
                existing.CurrentBatchNumber = entity.CurrentBatchNumber;
                existing.SequenceIncrement = entity.SequenceIncrement;
                existing.NextBatchNumber = entity.NextBatchNumber;
                await _repositoryJournalBatchSequence.UpdateAsync(existing);
                return;
            }
            
            await _repositoryJournalBatchSequence.InsertAsync(entity);
        }
        
        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryJournal.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryJournal.GetAllListAsync();
        }
        
        public async Task<object> ListAll(bool isPosted)
        {
            var journalList = await _repositoryJournal.GetAllListAsync(x=> x.IsPosted == isPosted && !x.IsTemporary);
            
            List<object> journalEntries = new List<object>();
            
            foreach (var journalHeader in journalList)
            {
                var journalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == journalHeader.Id);
                
                journalEntries.Add(new { journalHeader.Id, journalId = journalHeader.Id, journalHeader.BatchDate, journalHeader.BatchNumber, journalHeader.IsPosted, journalHeader.BatchDescription, journalHeader.TotalCredit, journalHeader.TotalDebit, journalHeader.TransactionSource, journalHeader, journalDetails });
            }
            
            return journalEntries;
        }
        public async Task Delete(Guid id)
        {
            await _repositoryJournal.DeleteAsync(id);
        }

        public async Task<object> GetJournalTransactionsByPeriod(int month, int year)
        {
            var startDate = new DateTime(year, 1, 1);
            var endDate = new DateTime(year, month, DateTime.DaysInMonth(year, month));
            
            // => 
            var journals = await _repositoryJournal.GetAll()
                .Where(j => j.BatchDate >= startDate  && j.BatchDate <= endDate)
                .ToListAsync();

            var result = new List<object>();
            
            foreach (var journal in journals)
            {
                var journalDetails = await _repositoryJournalDetail.GetAllListAsync(a=> a.JournalId == journal.Id);
                
                var journalTransactionDto = new
                {
                    journal,
                    journalDetails = journalDetails.OrderByDescending(d => d.TransactionDate).ToList()
                };

                result.Add(journalTransactionDto);
            }
            
            return result;
            
        }

        public async Task Update(UpdateJournalDetailsDto input)
        {
            var journalDetail = await _repositoryJournalDetail.FirstOrDefaultAsync(a=> a.JournalId == input.JournalId && a.Id == input.Id);

            if (journalDetail != null)
            {
                journalDetail.AccountId = input.AccountId;
                journalDetail.OuId = input.OuId;
                journalDetail.AccountName = input.AccountName;
                journalDetail.OuName = input.OuName;
                journalDetail.ReferenceNumber = input.ReferenceNumber;
                journalDetail.ChequeNo = input.ChequeNo;
                journalDetail.Description = input.Description;
                journalDetail.TransactionDate = input.TransactionDate;
                
                await _repositoryJournalDetail.UpdateAsync(journalDetail);
                
            }
        }

        public async Task BatchDelete(List<Guid> ids)
        {
            foreach (var t in ids)
            {
                await _repositoryJournal.DeleteAsync(t);
            }
            
        }
        
        public async Task<object> RetrieveJournalBatchSequence()
        {
            var sequence = await _repositoryJournalBatchSequence.GetAll().FirstOrDefaultAsync();

            if (sequence == null)
            {
                return null;
            }
            
            return new
            {
                sequence.CurrentBatchNumber,
                sequence.NextBatchNumber,
                sequence.Prefix,
                sequence.Suffix,
                sequence.SequenceIncrement
            };
        }
        
        public async Task Post(List<Guid> ids)
        {
            foreach (var t in ids)
            {
                var journalEntry = await _repositoryJournal.FirstOrDefaultAsync(t);
                journalEntry.IsPosted = true;
                await _repositoryJournal.UpdateAsync(journalEntry);
                
                var journalDetails = await _repositoryJournalDetail.GetAllListAsync(x => x.JournalId == journalEntry.Id);
                foreach (var journalDetail in journalDetails)
                {
                    journalDetail.IsPosted = true;
                    await _repositoryJournalDetail.UpdateAsync(journalDetail);
                }
            }
        }
        
        //
        public async Task<object> GetTransactions(DateTime startDate, DateTime endDate, string source, bool isMultiCurrency)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            var journals = await _repositoryJournal.GetAll()
                .Where(j => j.BatchDate >= start 
                            && j.BatchDate <= end 
                            && j.TransactionSource == "AP")
                .ToListAsync();

            var result = new List<object>();
            
            foreach (var journal in journals)
            {
                var journalDetails = await _repositoryJournalDetail.GetAllListAsync(a=> a.JournalId == journal.Id);
                
                var journalTransactionDto = new
                {
                    journal,
                    journalDetails = journalDetails.OrderByDescending(d => d.CreditAmount > 0).ToList()
                };

                result.Add(journalTransactionDto);
            }
            
            return result;
            
        }
    }
}
