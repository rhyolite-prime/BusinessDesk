using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.BillFooters;

public interface IBillFooterManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(BillFooter billFooter);
    Task Update(BillFooter billFooter);
    Task Delete(Guid id);
    
}