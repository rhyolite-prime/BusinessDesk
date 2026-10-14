using TopazERP.Models.Ar;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


namespace TopazERP.DomainServices.Ar.ArOpeningBalances;

public interface IArOpeningBalanceManager: Abp.Domain.Services.IDomainService
{
    Task<object> ListAll();
    Task<object> Create(ArOpeningBalance input);
    Task Update(ArOpeningBalance input);
    Task Delete(Guid Id);
    Task<object> PostArOpeningBalances(List<Guid> balanceIds);
    
    //getposted opening balances
    Task<object> GetPostedOpeningBalances();
    
    Task<Guid?> GetOuIdByHierarchyAsync(string hierarchyName);
    
    Task<ArOpeningBalance> GetAsync(string customerName, string currencyName);
}