using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.OpeningBalances.Dto;

namespace TopazERP.Services.SchoolManager.OpeningBalances;

public interface IOpeningBalanceAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateStudentOpeningBalanceInput entity);
    Task Update(UpdateStudentOpeningBalanceInput entity);
    Task Delete(Guid id);
    Task<object> Delete(List<Guid> balanceIds);
    Task<object> GetAsync(string studentName);
    Task<object> PostBalances(List<Guid> balanceIds);
    
}