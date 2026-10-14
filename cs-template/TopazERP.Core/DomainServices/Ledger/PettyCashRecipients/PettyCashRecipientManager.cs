using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.PettyCashRecipients
{
   public class PettyCashRecipientManager : Abp.Domain.Services.DomainService, IPettyCashRecipientManager
    {
        private readonly IRepository<PettyCashRecipient, Guid> _repositoryPettyCashRecipient;

        public PettyCashRecipientManager(IRepository<PettyCashRecipient, Guid> repositoryPettyCashRecipient)
        {
            _repositoryPettyCashRecipient = repositoryPettyCashRecipient;
        }

        public async Task<object> Create(PettyCashRecipient entity)
        {
            var datta = await _repositoryPettyCashRecipient.FirstOrDefaultAsync(x => x.Recipient == entity.Recipient);

            if (datta == null)
            {
                await _repositoryPettyCashRecipient.InsertAsync(entity);

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

        public async Task Update(PettyCashRecipient entity)
        {
            await _repositoryPettyCashRecipient.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryPettyCashRecipient.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryPettyCashRecipient.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryPettyCashRecipient.DeleteAsync(id);

        }
    }
}
