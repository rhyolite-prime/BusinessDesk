using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffQualifications
{
    public class StaffQualificationManager : Abp.Domain.Services.DomainService, IStaffQualificationManager
    {
        private readonly IRepository<StaffQualification, Guid> _repository;

        public StaffQualificationManager(IRepository<StaffQualification, Guid> repository)
        {
            _repository = repository;
        }

        public async Task<object> Create(StaffQualification entity)
        {
            var duplicate = await _repository.FirstOrDefaultAsync(x =>
                x.Institute == entity.Institute &&
                x.Programme == entity.Programme && x.CertificateId == entity.CertificateId);

            if (duplicate == null)
            {
                await _repository.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }

            return new { code = 400, message = "Duplicate qualification not allowed." };
        }

        public async Task Update(StaffQualification entity)
        {
            await _repository.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repository.GetAllListAsync();
            return data.OrderBy(x => x.Institute).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repository.DeleteAsync(id);
        }
    }
}