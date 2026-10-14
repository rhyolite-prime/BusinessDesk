using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Customers
{
    public class CustomerManager : Abp.Domain.Services.DomainService, ICustomerManager
    {

        private readonly IRepository<Customer, Guid> _repositoryCustomer;

        public CustomerManager(IRepository<Customer, Guid> repositoryCustomer)
        {
            _repositoryCustomer = repositoryCustomer;
        }

        public async Task<object> Create(Customer entity)
        {
            var existingCustomer = await _repositoryCustomer.FirstOrDefaultAsync(x => 
                x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() ||
                x.AccountNumber.Trim() == entity.AccountNumber.Trim() ||
                x.VatNumber.Trim() == entity.VatNumber.Trim());

            if (existingCustomer == null)
            {
                // No duplicate found, insert the new entity
                await _repositoryCustomer.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "Customer created successfully."
                };
            }
            else
            {
                // Duplicate found, return an error message
                return new
                {
                    code = 400,
                    message = "Duplicate records are not allowed."
                };
            }
        }

        public async Task<object> Update(Customer entity)
        {
            var existingcCustomer = await _repositoryCustomer.FirstOrDefaultAsync(x => x.VatNumber.Trim() == entity.VatNumber.Trim() && x.Id != entity.Id);
            
            if (existingcCustomer == null)
            {
                await _repositoryCustomer.UpdateAsync(entity);
                return new
                {
                    code = 200,
                    message = "Customer created successfully."
                };
               
            }
            else
            {
                // Duplicate found, return an error message
                return new
                {
                    code = 400,
                    message = "Duplicate records are not allowed."
                };
            }

        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryCustomer.GetAllListAsync();
            return data.OrderBy(data => data.Name).ToList();

        }

        public async Task<object> ListAllByGroup(Guid groupId)
        {
            return await _repositoryCustomer.GetAllListAsync(x=>x.CustomerGroupId == groupId);
        }

        
        public async Task Delete(Guid id)
        {
            await _repositoryCustomer.DeleteAsync(id);

        }
        
        public async Task<Customer> GetAsync(string customerName)
        {
            var customer = await _repositoryCustomer.FirstOrDefaultAsync(x => 
                !string.IsNullOrEmpty(customerName) && x.Name.Trim().ToLower() == customerName.Trim().ToLower()
            );
            return customer;
        }

    }
}
