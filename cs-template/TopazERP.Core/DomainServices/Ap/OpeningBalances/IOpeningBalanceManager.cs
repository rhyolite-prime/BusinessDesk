using TopazERP.Models.Ap;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Ap.OpeningBalances.Dto;

namespace TopazERP.DomainServices.Ap.OpeningBalances;

public interface IOpeningBalanceManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll();
    Task<object> Create(ApOpeningBalance input);
    Task Update(ApOpeningBalance input);
    Task Delete(Guid Id);
    Task<object> PostOpeningBalances(List<Guid> balanceIds);
    
    //getposted opening balances
    Task<object> GetPostedOpeningBalances();
    Task<object> GetOuHierarchy();
    //get ou async
    Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName);

    
    Task<ApOpeningBalance> GetAsync(string supplierName, string currencyName);

}
