using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Ledger.BankAccounts
{
   public class BankAccountManager : Abp.Domain.Services.DomainService, IBankAccountManager
    {
        private readonly IRepository<BankAccount, Guid> _repositoryBankAccount;

        public BankAccountManager(IRepository<BankAccount, Guid> repositoryBankAccount)
        {
            _repositoryBankAccount = repositoryBankAccount;
        }

        public async Task<object> Create(BankAccount entity)
        {
            var datta = await _repositoryBankAccount.FirstOrDefaultAsync(x => x.BankId == entity.BankId && x.AccountType == entity.AccountType && x.AccountNo == entity.AccountNo);

            if (datta == null)
            {
                await _repositoryBankAccount.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }

            return new
            {
                code = 400,
                message = "Duplicate accounts are not allowed."
            };
        }

        public async Task Update(BankAccount entity)
        {
            await _repositoryBankAccount.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryBankAccount.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryBankAccount.GetAllListAsync();
            
            return data.Select(x => new
            {
                x.Id,
                x.TenantId,
                x.BankName,
                x.BankBranchId,
                x.BankBranchName,
                x.AccountNo,
                x.AccountId,
                x.AccountName,
                x.Location,
                x.AccountType,
                x.CurrencyId,
                x.CurrencyName,
                x.CurrencyCode,
                x.ContactPerson,
                x.ContactNo,
                x.ChequeBookStart,
                x.ChequeBookEnd,
                DateOpened = x.DateOpened.ToString("dd-MM-yyyy"),
            }).ToList();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryBankAccount.DeleteAsync(id);

        }
    }
}
