using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ap;

namespace TopazERP.DomainServices.Shared.Suppliers
{
   public class SupplierManager: Abp.Domain.Services.DomainService,  ISupplierManager
    {

        private readonly IRepository<Supplier, Guid> _repositorySupplier;
        private readonly IRepository<ApInvoice, Guid> _repositoryApInvoice;
        private readonly IRepository<ApOpeningBalance, Guid> _repositoryOpeningBalances;

        public SupplierManager(IRepository<Supplier, Guid> repositorySupplier, IRepository<ApInvoice, Guid> repositoryApInvoice, IRepository<ApOpeningBalance, Guid> repositoryOpeningBalances)
        {
            _repositorySupplier = repositorySupplier;
            _repositoryApInvoice = repositoryApInvoice;
            _repositoryOpeningBalances = repositoryOpeningBalances;
        }
        
      

        public async Task<object> Create(Supplier entity)
        {
            // Check if a record with the same Name, AccountNumber, or VatNumber already exists
            var existingSupplier = await _repositorySupplier.FirstOrDefaultAsync(x => 
                x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() ||
                x.AccountNumber.Trim() == entity.AccountNumber.Trim());

            if (existingSupplier == null)
            {
                // No duplicate found, insert the new entity
                await _repositorySupplier.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "Supplier created successfully."
                };
            }

            // Duplicate found, return an error message
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }

        public async Task Update(Supplier entity)
        {
            await _repositorySupplier.UpdateAsync(entity);
        }

       public async Task<object> ListAll()
        {  
            var suppliers = await _repositorySupplier.GetAllListAsync();
            return suppliers.OrderBy(supplier => supplier.Name).ToList();
        }



        public async Task<object> ListAllByGroup(Guid groupId)
        {
            return await _repositorySupplier.GetAllListAsync(x => x.SupplierGroupId == groupId);
        }


        public async Task Delete(Guid id)
        {
            await _repositorySupplier.DeleteAsync(id);

        }
        
        public async Task<Supplier> GetAsync(string supplierNaame)
        {
            var supplier = await _repositorySupplier.FirstOrDefaultAsync(x => 
                !string.IsNullOrEmpty(supplierNaame) && x.Name.Trim().ToLower() == supplierNaame.Trim().ToLower()
            );
            return supplier;
        }
       
    }
}
