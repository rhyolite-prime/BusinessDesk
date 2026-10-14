using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.PtaExecutives;

public interface IPtaExecutiveManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(PtaExecutive ptaExecutive);
    Task Update(PtaExecutive ptaExecutive);
    Task Delete(Guid id);
    
}