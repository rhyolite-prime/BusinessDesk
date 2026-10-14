using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.AccountingPeriods;
using TopazERP.Models.Ledger;

namespace TopazERP.Services.Ledger.AccountingPeriods;

public class AccountingPeriodAppService: TopazERPAppServiceBase, IAccountingPeriodAppService
{
    private readonly IAccountingPeriodManager  _accountingPeriodManager;
    private readonly IMapper _mapper;

    public AccountingPeriodAppService(IAccountingPeriodManager accountingPeriodManager, IMapper mapper)
    {
        _accountingPeriodManager = accountingPeriodManager;
        _mapper = mapper;
    }

    public async Task<object> GetLastClosedPeriod()
    {
        return await _accountingPeriodManager.GetLastClosedPeriod();
    }

    public async Task ClosePeriod(int month, int year)
    {
        if (month == 12)
        {
            // When closing December, we need to close the entire year
            // Create accounting periods for all months of the year if they don't exist
            for (int m = 1; m <= 12; m++)
            {
                var monthStartDate = new DateTime(year, m, 1);
                var monthEndDate = new DateTime(year, m, DateTime.DaysInMonth(year, m));
            
                await _accountingPeriodManager.Close(new AccountingPeriod
                {
                    AccountingPeriodStartDate = monthStartDate,
                    AccountingPeriodEndDate = monthEndDate,
                    IsClosed = true, // Close all months when December is being closed
                    Period = Convert.ToInt32($"{year}{m:D2}"), // Use D2 to ensure 2-digit month format
                });
            }
        }
        else
        {
            // For other months, create only that specific month
            var startDate = new DateTime(year, month, 1);
            var endDate = new DateTime(year, month, DateTime.DaysInMonth(year, month));
        
            await _accountingPeriodManager.Close(new AccountingPeriod
            {
                AccountingPeriodStartDate = startDate,
                AccountingPeriodEndDate = endDate, 
                LastClosedDate = DateTime.UtcNow,
                IsClosed = true, 
                Period = Convert.ToInt32($"{year}{month:D2}"),
            });
        }
        
    }
    
    public async Task ReopenClosedPeriod(int month, int year)
    {
        if (month == 12)
        {
            // When reopening December, we need to reopen the entire year
            // Reopen accounting periods for all months of the year
            for (int m = 1; m <= 12; m++)
            {
                await _accountingPeriodManager.Reopen(m, year);
            }
        }
        else
        {
            // For other months, reopen only that specific month
            await _accountingPeriodManager.Reopen(month, year);
        }
    }
}