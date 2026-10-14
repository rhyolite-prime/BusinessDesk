using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Payroll;

namespace TopazERP.DomainServices.Shared.Departments
{
    public class DepartmentManager: Abp.Domain.Services.DomainService, IDepartmentManager
    {

        private readonly IRepository<Department, Guid> _repositoryDepartment;

        public DepartmentManager(IRepository<Department, Guid> repositoryDepartment)
        {
            _repositoryDepartment = repositoryDepartment;
        }

        public async Task<object> Create(Department entity)
        {
            var datta = await _repositoryDepartment.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() && x.ParentId == entity.ParentId);

            if (datta == null)
            {
                await _repositoryDepartment.InsertAsync(entity);

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

        public async Task Update(Department entity)
        {
            await _repositoryDepartment.UpdateAsync(entity);
        }


        public async Task<Department> GetAsync(string name)
        {
            return await _repositoryDepartment.FirstOrDefaultAsync(x => x.Name == name);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryDepartment.GetAllListAsync();
            return data.OrderBy(data => data.Name).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryDepartment.DeleteAsync(id);

        }
    }
}
