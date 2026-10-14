using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.Certificates.Dto;

namespace TopazERP.Services.SchoolManager.Certificates
{
    public interface ICertificateAppService : Abp.Application.Services.IApplicationService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(CreateCertificateInput input);
        Task Update(UpdateCertificateInput input);
        Task Delete(Guid id);
    }
}