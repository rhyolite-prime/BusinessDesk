using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeReliefs
{
   public class EmployeeReliefManager: Abp.Domain.Services.DomainService, IEmployeeReliefManager
    {
        private readonly IRepository<EmployeeRelief, Guid> _repositoryEmployeeRelief;

        public EmployeeReliefManager(IRepository<EmployeeRelief, Guid> repositoryEmployeeRelief)
        {
            _repositoryEmployeeRelief = repositoryEmployeeRelief;
        }

        public async Task<object> Create(EmployeeRelief entity)
        {
            var data = await _repositoryEmployeeRelief.FirstOrDefaultAsync(x=> x.EmployeeId == entity.EmployeeId && x.ReliefTypeId == entity.ReliefTypeId);
            
            if (data == null)
            {
                await _repositoryEmployeeRelief.InsertAsync(entity);

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

        public async Task Update(EmployeeRelief entity)
        {
            await _repositoryEmployeeRelief.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryEmployeeRelief.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryEmployeeRelief.GetAllListAsync();
            return data.OrderBy(a=>a.EmployeeName);
        }

        public async Task<object> ListAll(Guid employeeId)
        {
            return await _repositoryEmployeeRelief.GetAllListAsync(x=>x.EmployeeId == employeeId);
        }

        public async Task Delete(Guid id)
        {
            await _repositoryEmployeeRelief.DeleteAsync(id);

        }
    }
}
