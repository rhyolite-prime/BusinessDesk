using Abp.Domain.Repositories;
using TopazERP.DomainServices.Shared.SupplierGroups;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.CustomerGroups
{
    public class CustomerGroupManager : Abp.Domain.Services.DomainService, ICustomerGroupManager
    {
        private readonly IRepository<CustomerGroup, Guid> _repositoryCustomerGroup;

        public CustomerGroupManager(IRepository<CustomerGroup, Guid> repositoryCustomerGroup)
        {
            _repositoryCustomerGroup = repositoryCustomerGroup;
        }

        public async Task<object> Create(CustomerGroup entity)
        {
            var datta = await _repositoryCustomerGroup.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryCustomerGroup.InsertAsync(entity);

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

        public async Task Update(CustomerGroup entity)
        {
            await _repositoryCustomerGroup.UpdateAsync(entity);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryCustomerGroup.GetAllListAsync();

            return data.OrderBy(data => data.Name).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryCustomerGroup.DeleteAsync(id);

        }
        
        public async Task<CustomerGroup> GetAsync(string name)
        {
            var data = await _repositoryCustomerGroup.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == name.Trim().ToLower());
            return data;
        }
    }
}
