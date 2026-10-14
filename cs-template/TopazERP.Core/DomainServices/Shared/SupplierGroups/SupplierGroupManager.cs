using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.SupplierGroups
{
    public class SupplierGroupManager : Abp.Domain.Services.DomainService, ISupplierGroupManager
    {

        private readonly IRepository<SupplierGroup, Guid> _repositorySupplierGroup;

        public SupplierGroupManager(IRepository<SupplierGroup, Guid> repositorySupplierGroup)
        {
            _repositorySupplierGroup = repositorySupplierGroup;
        }

        public async Task<object> Create(SupplierGroup entity)
        {
            var datta = await _repositorySupplierGroup.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositorySupplierGroup.InsertAsync(entity);

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

        public async Task Update(SupplierGroup entity)
        {
            await _repositorySupplierGroup.UpdateAsync(entity);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositorySupplierGroup.GetAllListAsync();
            return data.OrderBy(data => data.Name).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositorySupplierGroup.DeleteAsync(id);

        }
        
        public async Task<SupplierGroup> GetAsync(string name)
        {
            return await _repositorySupplierGroup.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == name.Trim().ToLower());
        }
    }
}
