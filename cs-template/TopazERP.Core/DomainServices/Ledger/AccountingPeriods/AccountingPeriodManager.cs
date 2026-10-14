using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.UI;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.AccountingPeriods
{
   public class AccountingPeriodManager : Abp.Domain.Services.DomainService, IAccountingPeriodManager
    {
        private readonly IRepository<AccountingPeriod, Guid> _repositoryAccountingPeriod;

        public AccountingPeriodManager(IRepository<AccountingPeriod, Guid> repositoryAccountingPeriod)
        {
            _repositoryAccountingPeriod = repositoryAccountingPeriod;
        }

       
        public async Task Close(AccountingPeriod period)
        {
            //check integrity of all transactions before closing ...
            
            await _repositoryAccountingPeriod.InsertAsync(period);
        }
        
        public async Task<object> GetLastClosedPeriod()
        {
            var lastClosedPeriod = await _repositoryAccountingPeriod
                .GetAll()
                .Where(p => p.IsClosed)
                .OrderByDescending(p => p.Period)
                .FirstOrDefaultAsync();
        
            return lastClosedPeriod;
        }

        public async Task ReopenClosedPeriod(Guid id)
        {
            var accountingPeriod = await _repositoryAccountingPeriod.GetAsync(id);
            if (accountingPeriod == null)
            {
                throw new UserFriendlyException(400,"Accounting period not found.");
            }
            accountingPeriod.IsClosed = false;
            await _repositoryAccountingPeriod.UpdateAsync(accountingPeriod);
        }
        
        public async Task Reopen(int month, int year)
        {
            var period = Convert.ToInt32($"{year}{month:D2}");
    
            var accountingPeriod = await _repositoryAccountingPeriod.FirstOrDefaultAsync(p => p.Period == period);
        
            if (accountingPeriod == null)
            {
                throw new UserFriendlyException(400, $"Accounting period for {month:D2}/{year} not found.");
            }
    
            if (!accountingPeriod.IsClosed)
            {
                throw new UserFriendlyException(400, $"Accounting period for {month:D2}/{year} is already open.");
            }
    
            accountingPeriod.IsClosed = false;
            await _repositoryAccountingPeriod.UpdateAsync(accountingPeriod);
        }
        
        
    }
}
