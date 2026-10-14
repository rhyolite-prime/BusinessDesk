using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Certificates
{
    public class CertificateManager : Abp.Domain.Services.DomainService, ICertificateManager
    {
        private readonly IRepository<Certificate, Guid> _repositoryCertificate;

        public CertificateManager(IRepository<Certificate, Guid> repositoryCertificate)
        {
            _repositoryCertificate = repositoryCertificate;
        }

        public async Task<object> Create(Certificate entity)
        {
            var data = await _repositoryCertificate.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (data == null)
            {
                await _repositoryCertificate.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }
            else
            {
                return new { code = 400, message = "Duplicate records are not allowed." };
            }
        }

        public async Task Update(Certificate entity)
        {
            await _repositoryCertificate.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repositoryCertificate.GetAllListAsync();
            return data.OrderBy(x => x.Name).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repositoryCertificate.DeleteAsync(id);
        }
    }
}