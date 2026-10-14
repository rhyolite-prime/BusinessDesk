using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ParentProfessions;

public interface IParentProfessionManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ParentProfession parentProfession);
    Task Update(ParentProfession parentProfession);
    Task Delete(Guid id);
}