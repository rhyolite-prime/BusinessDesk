using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Subjects;

public interface ISubjectManager : Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(Subject subject);
    Task Update(Subject subject);
    Task Delete(Guid id);
}