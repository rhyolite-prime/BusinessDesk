using Abp.Application.Services;
using TopazERP.Services.Ap.OpeningBalances.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ap.OpeningBalances;

public interface IOpeningBalanceAppService: IApplicationService
{
    Task<object> ListAll();
    Task<object> Create(CreateOpeningBalanceInput input);
    Task Update(UpdateOpeningBalanceInput input);
    Task Delete(Guid Id);
    
    //getposted opening balances
    Task<object> GetPostedOpeningBalances();
    Task<object> PostOpeningBalances(List<Guid> balanceIds);
    
    Task<object> GetAsync(string supplierName, string currencyName);
    Task<object> GetOuHierarchy();
    Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName);
}