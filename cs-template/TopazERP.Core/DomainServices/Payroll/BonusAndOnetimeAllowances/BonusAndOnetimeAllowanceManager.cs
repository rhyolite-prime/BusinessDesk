using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.BonusAndOnetimeAllowances
{
   public class BonusAndOnetimeAllowanceManager : Abp.Domain.Services.DomainService, IBonusAndOnetimeAllowanceManager
    {
        private readonly IRepository<BonusAndOnetimeAllowance, Guid> _repositoryBonusAndOnetimeAllowance;

        public BonusAndOnetimeAllowanceManager(IRepository<BonusAndOnetimeAllowance, Guid> repositoryBonusAndOnetimeAllowance)
        {
            _repositoryBonusAndOnetimeAllowance = repositoryBonusAndOnetimeAllowance;
        }

        public async Task Create(BonusAndOnetimeAllowance entity)
        {
            var datta = await _repositoryBonusAndOnetimeAllowance.FirstOrDefaultAsync(x => x.EmployeeId == entity.EmployeeId && x.AllowanceTypeId == entity.AllowanceTypeId && x.Month == entity.Month && x.Year == entity.Year);

            if (datta == null)
            {
                await _repositoryBonusAndOnetimeAllowance.InsertAsync(entity);

            }
            else
            {

                datta.AllowanceTypeId = entity.AllowanceTypeId;
                datta.IsFixedAmount = entity.IsFixedAmount;
                datta.Amount = entity.Amount;
                datta.Percentage = entity.Percentage;
                datta.IsTaxable = entity.IsTaxable;
                datta.IsSSF = entity.IsSSF;
                datta.IsPF = entity.IsPF;
                datta.AllowanceDays = entity.AllowanceDays;
                await _repositoryBonusAndOnetimeAllowance.UpdateAsync(entity);

            }
        }

        public async Task Update(BonusAndOnetimeAllowance entity)
        {
            await _repositoryBonusAndOnetimeAllowance.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryBonusAndOnetimeAllowance.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryBonusAndOnetimeAllowance.GetAllListAsync();

        }

        public async Task<object> ListAll(int month, int year)
        {
           return  await _repositoryBonusAndOnetimeAllowance.GetAllListAsync(x => x.Month == month && x.Year == year);

        }
        public async Task Delete(Guid id)
        {
            await _repositoryBonusAndOnetimeAllowance.DeleteAsync(id);

        }
    }
}
