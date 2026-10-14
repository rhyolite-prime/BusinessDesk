using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.CostCenters
{
    public class CostCenterManager: Abp.Domain.Services.DomainService, ICostCenterManager
    {
        private readonly IRepository<CostCenter, Guid> _repositoryCostCenter;

        public CostCenterManager(IRepository<CostCenter, Guid> repositoryCostCenter)
        {
            _repositoryCostCenter = repositoryCostCenter;
        }

        public async Task<object> Create(CostCenter entity)
        {
            var datta = await _repositoryCostCenter.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() && x.ParentId == entity.ParentId);

            if (datta == null)
            {
                await _repositoryCostCenter.InsertAsync(entity);

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

        public async Task Update(CostCenter entity)
        {
            await _repositoryCostCenter.UpdateAsync(entity);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryCostCenter.GetAllListAsync();
            return data.OrderBy(data => data.Name).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryCostCenter.DeleteAsync(id);

        }

    }
}
