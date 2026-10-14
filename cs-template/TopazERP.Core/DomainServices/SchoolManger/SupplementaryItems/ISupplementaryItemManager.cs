using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SupplementaryItems;

public interface ISupplementaryItemManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(SupplementaryItem supplementaryItem);
    Task Update(SupplementaryItem supplementaryItem);
    Task Delete(Guid id);
}