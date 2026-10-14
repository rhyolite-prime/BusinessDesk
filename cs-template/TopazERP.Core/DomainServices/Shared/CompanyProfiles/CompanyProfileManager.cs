using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Shared.CompanyProfiles
{
    public class CompanyProfileManager: Abp.Domain.Services.DomainService, ICompanyProfileManager
    {
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;
        private readonly IRepository<Currency, Guid> _repositoryCurrency;

        public CompanyProfileManager(IRepository<CompanyProfile, Guid> repositoryCompanyProfile, IRepository<Currency, Guid> repositoryCurrency)
        {
            _repositoryCompanyProfile = repositoryCompanyProfile;
            _repositoryCurrency = repositoryCurrency;
        }

        public async Task Create(CompanyProfile entity)
        {
            await _repositoryCompanyProfile.InsertAsync(entity);

            if (entity.DefaultCurrenyId != Guid.Empty)
            {
                var currencyInfo = await _repositoryCurrency.FirstOrDefaultAsync(entity.DefaultCurrenyId);

                if (currencyInfo != null)
                {
                    currencyInfo.IsDefault = true;

                    await _repositoryCurrency.UpdateAsync(currencyInfo);
                }

            }
        }

        public async Task<CompanyProfile> GetProfile()
        {
            return await _repositoryCompanyProfile.GetAll().FirstOrDefaultAsync();
        }

        public async Task Update(CompanyProfile entity)
        {
            await _repositoryCompanyProfile.UpdateAsync(entity);

            if (entity.DefaultCurrenyId != Guid.Empty)
            {
                var currencyInfo = await _repositoryCurrency.FirstOrDefaultAsync(entity.DefaultCurrenyId);

                if (currencyInfo != null)
                {
                    currencyInfo.IsDefault = true;

                    await _repositoryCurrency.UpdateAsync(currencyInfo);
                }

                // set the rest of the currencies to false
                var currencies = await _repositoryCurrency.GetAllListAsync();
                
                foreach (var currency in currencies)
                {
                    if (currency.Id != entity.DefaultCurrenyId)
                    {
                        currency.IsDefault = false;
                        await _repositoryCurrency.UpdateAsync(currency);
                    }
                }

            }
        }
    }
}
