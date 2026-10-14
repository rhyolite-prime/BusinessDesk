using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Certificates
{
    public interface ICertificateManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(Certificate certificate);
        Task Update(Certificate certificate);
        Task Delete(Guid id);
    }
}