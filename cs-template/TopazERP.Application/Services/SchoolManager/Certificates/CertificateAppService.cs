using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Certificates;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Certificates.Dto;

namespace TopazERP.Services.SchoolManager.Certificates
{
    public class CertificateAppService : TopazERPAppServiceBase, ICertificateAppService
    {
        private readonly ICertificateManager _certificateManager;
        private readonly IMapper _mapper;

        public CertificateAppService(ICertificateManager certificateManager, IMapper mapper)
        {
            _certificateManager = certificateManager;
            _mapper = mapper;
        }

        public async Task<object> Create(CreateCertificateInput input)
        {
            var entity = _mapper.Map<Certificate>(input);
            return await _certificateManager.Create(entity);
        }

        public async Task Update(UpdateCertificateInput input)
        {
            var entity = _mapper.Map<Certificate>(input);
            await _certificateManager.Update(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _certificateManager.ListAll();
        }

        public async Task Delete(Guid id)
        {
            await _certificateManager.Delete(id);
        }
    }
}