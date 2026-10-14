using System;
using System.Threading.Tasks;
using Abp.Application.Services;

namespace TopazERP.Services.Ledger.AccountingPeriods;

public interface IAccountingPeriodAppService:  IApplicationService
{
    Task ClosePeriod(int month, int year);
    Task ReopenClosedPeriod(int month, int year);
    Task<object> GetLastClosedPeriod();
}