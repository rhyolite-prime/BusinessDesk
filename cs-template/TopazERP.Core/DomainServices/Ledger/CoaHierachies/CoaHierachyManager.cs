using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.CoaHierachies
{
   public class CoaHierachyManager : Abp.Domain.Services.DomainService, ICoaHierachyManager
    {
        private readonly IRepository<CoaHierachy, Guid> _repositoryCoaHierachy;

        public CoaHierachyManager(IRepository<CoaHierachy, Guid> repositoryCoaHierachy)
        {
            _repositoryCoaHierachy = repositoryCoaHierachy;
        }

        public async Task<object> Create(CoaHierachy entity)
        {
            
            var datta = await _repositoryCoaHierachy.FirstOrDefaultAsync(x => x.Name == entity.Name && x.ParentId == entity.ParentId);
            
            if (datta == null)
            {
                //use id to get parent account ordinal
                //var allAccounts = await _repositoryCoaHierachy.GetAllListAsync();
                //var parentAccount = allAccounts.FirstOrDefault(x => x.Id == entity.ParentId);
                //var childAccounts = allAccounts.Where(x => x.ParentId == entity.ParentId).ToList();


                await _repositoryCoaHierachy.InsertAsync(entity);


                //if (childAccounts.Any())
                //{
                //    double maxAccountValue = childAccounts.Max(a => a.Ordinal);
                //    entity.Ordinal = maxAccountValue + 0.01;
                //    await _repositoryCoaHierachy.InsertAsync(entity);

                //}
                //else
                //{
                //    if (parentAccount != null)
                //    {
                //        double maxAccountValue = parentAccount.Ordinal;
                //        entity.Ordinal = maxAccountValue + 0.01;
                //        await _repositoryCoaHierachy.InsertAsync(entity);

                //    }
                //}

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

        public async Task Update(CoaHierachy entity)
        {
            await _repositoryCoaHierachy.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryCoaHierachy.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryCoaHierachy.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryCoaHierachy.DeleteAsync(id);

        }
    }
}
