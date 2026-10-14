using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.CoaControls
{
   public class CoaControlManager : Abp.Domain.Services.DomainService, ICoaControlManager
    {
        private readonly IRepository<CoaControl, Guid> _repositoryCoaControl;

        public CoaControlManager(IRepository<CoaControl, Guid> repositoryCoaControl)
        {
            _repositoryCoaControl = repositoryCoaControl;
        }

        public async Task<object> Create(CoaControl entity)
        {
            var coaControl =
                await _repositoryCoaControl.FirstOrDefaultAsync(x => x.Id == entity.AccountGroupId && x.MinAccount == entity.MinAccount && x.MaxAccount == entity.MaxAccount);

            if (coaControl == null)
            {
                var parentControl = await _repositoryCoaControl.FirstOrDefaultAsync(x => x.Id == entity.ParentAccountHeaderId && x.MinAccount == entity.MinAccount && x.MaxAccount == entity.MaxAccount);
                if (parentControl != null)
                {
                    if (entity.MinAccount < parentControl.MinAccount || entity.MaxAccount > parentControl.MaxAccount)
                    {
                        return new
                        {
                            code = 400,
                            message = $"Account range must be between {parentControl.MinAccount} and {parentControl.MaxAccount}."
                        };
                    }
                }
                await _repositoryCoaControl.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }

            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }

        public async Task Update(CoaControl entity)
        {
            await _repositoryCoaControl.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryCoaControl.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll(Guid id)
        {
            return await _repositoryCoaControl.GetAllListAsync(x=>x.AccountGroupId == id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryCoaControl.GetAllListAsync();
        }

        public async Task Delete(Guid id)
        {
            await _repositoryCoaControl.DeleteAsync(id);

        }
    }
}
