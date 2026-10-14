using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.OpeningBalances;

public interface IOpeningBalanceManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(StudentOpeningBalance entity);
    Task Update(StudentOpeningBalance entity);
    Task Delete(Guid id);
    Task<object> Delete(List<Guid> balanceIds);
    Task<StudentOpeningBalance> GetAsync(string studentName);
    Task<object> PostBalances(List<Guid> balanceIds);
}