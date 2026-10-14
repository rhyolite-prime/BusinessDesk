using Abp.Domain.Repositories;
using TopazERP.Models.Ledger;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.UI;
using TopazERP.DomainServices.Ledger.Budgets.Dto;

namespace TopazERP.DomainServices.Ledger.Budgets
{
   public class BudgetManager : Abp.Domain.Services.DomainService, IBudgetManager
    {
        private readonly IRepository<Budget, Guid> _repositoryBudget;

        public BudgetManager(IRepository<Budget, Guid> repositoryBudget)
        {
            _repositoryBudget = repositoryBudget;
        }

        public async Task<object> Create(Budget entity)
        {
            var datta = await _repositoryBudget.FirstOrDefaultAsync(x => x.AccountId == entity.AccountId && x.OuId == entity.OuId);

            if (datta == null)
            {
                await _repositoryBudget.InsertAsync(entity);

                return new
                {
                    code = 200,
                    message = "successful"
                };
            }
            
            throw new UserFriendlyException(400,"Duplicate records are not allowed.");

        }

        public async Task Update(Budget entity)
        {
            await _repositoryBudget.UpdateAsync(entity);
        }
        
        public async Task UpdateBudgetDetail(BudgetDetailInput input)
        {
            var budgetData = await _repositoryBudget.GetAsync(input.BudgetId);
            var budgetDetailsList = budgetData.BudgetDetails;
            var budgetDetailInfo = budgetDetailsList.FirstOrDefault(x => x.Id == input.Id);
            
            budgetDetailsList.Remove(budgetDetailInfo);

            if (budgetDetailInfo != null)
            {
                budgetDetailInfo.Month = input.Month;
                budgetDetailInfo.Year = input.Year;
                budgetDetailInfo.RevisedAmount = input.RevisedAmount;
                budgetDetailInfo.BudgetAmount = input.BudgetAmount;

                budgetDetailsList.Add(budgetDetailInfo);
            }

            budgetData.BudgetDetails = budgetDetailsList;

            await _repositoryBudget.UpdateAsync(budgetData);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryBudget.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryBudget.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryBudget.DeleteAsync(id);
        }
        
        public async Task<object> CreateBudgetDetail(BudgetDetailInput input)
        {
            var budgetData = await _repositoryBudget.GetAsync(input.BudgetId);
            var budgetDetailsList = budgetData.BudgetDetails;
            var budgetDetailInfo = budgetDetailsList.FirstOrDefault(x => x.Id == input.Id);

            if (budgetDetailInfo == null)
            {
                budgetData.BudgetDetails.Add(new BudgetDetail
                {
                    Id = Guid.NewGuid(),
                    Month = input.Month,
                    Year = input.Year,
                    RevisedAmount = input.RevisedAmount,
                    BudgetAmount = input.BudgetAmount
                      
                });

                await _repositoryBudget.UpdateAsync(budgetData);

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
        
        public async Task DeleteBudgetDetail(BudgetDetailInput input)
        {
            var budgetData = await _repositoryBudget.GetAsync(input.BudgetId);
            var budgetDetailsList = budgetData.BudgetDetails;
            var budgetDetailInfo = budgetDetailsList.FirstOrDefault(x => x.Id == input.Id);
            
            budgetDetailsList.Remove(budgetDetailInfo);

            budgetData.BudgetDetails = budgetDetailsList;

            await _repositoryBudget.UpdateAsync(budgetData);

        }
    }
}
