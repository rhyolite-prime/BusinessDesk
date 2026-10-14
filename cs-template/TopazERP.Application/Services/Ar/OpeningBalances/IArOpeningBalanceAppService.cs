using Abp.Application.Services;
using TopazERP.Services.Ar.OpeningBalances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ar.OpeningBalances;

public interface IArOpeningBalanceAppService: IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateArOpeningBalanceInput input);
    Task Update(UpdateArOpeningBalanceInput input);
    Task Delete(Guid Id);
    
    //getposted opening balances
    Task<object> GetPostedOpeningBalances();
    Task<object> PostArOpeningBalances(List<Guid> balanceIds);
    
    Task<object> GetAsync(string customerName, string currencyName);
    
    Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName);
}