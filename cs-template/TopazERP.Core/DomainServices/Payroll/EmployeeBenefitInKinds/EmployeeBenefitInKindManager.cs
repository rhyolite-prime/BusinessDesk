using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeBenefitInKinds
{
   public class EmployeeBenefitInKindManager : Abp.Domain.Services.DomainService, IEmployeeBenefitInKindManager
    {
        private readonly IRepository<EmployeeBenefitInKind, Guid> _repositoryEmployeeBenefitInKind;

        public EmployeeBenefitInKindManager(IRepository<EmployeeBenefitInKind, Guid> repositoryEmployeeBenefitInKind)
        {
            _repositoryEmployeeBenefitInKind = repositoryEmployeeBenefitInKind;
        }

        public async Task<object> Create(EmployeeBenefitInKind entity)
        {
            var data = await _repositoryEmployeeBenefitInKind.FirstOrDefaultAsync(x=> x.EmployeeId == entity.EmployeeId && x.BenefitInKindTypeId == entity.BenefitInKindTypeId);
            if (data == null)
            {
                await _repositoryEmployeeBenefitInKind.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }
            else
            {
                return new
                {
                    code = 400,
                    message = "Duplicate records are not allowed."
                };
            }

        }

        public async Task Update(EmployeeBenefitInKind entity)
        {
            await _repositoryEmployeeBenefitInKind.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeBenefitInKind.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryEmployeeBenefitInKind.GetAllListAsync();
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeBenefitInKind.GetAllListAsync(x=> x.EmployeeId == employeeId);
        }

        
        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeBenefitInKind.DeleteAsync(id);

        }
    }
}
