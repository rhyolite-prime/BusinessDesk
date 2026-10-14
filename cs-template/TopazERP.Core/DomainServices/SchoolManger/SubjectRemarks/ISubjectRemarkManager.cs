using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SubjectRemarks;

public interface ISubjectRemarkManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(SubjectRemark subjectRemark);
    Task Update(SubjectRemark subjectRemark);
    Task Delete(Guid id);
    
}