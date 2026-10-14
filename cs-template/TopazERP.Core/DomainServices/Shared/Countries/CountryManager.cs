using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Countries
{
   public class CountryManager: Abp.Domain.Services.DomainService, ICountryManager
    {
        private readonly IRepository<Country, Guid> _repositoryCountry;

        public CountryManager(IRepository<Country, Guid> repositoryCountry)
        {
            _repositoryCountry = repositoryCountry;
        }



        public async Task<object> Create(Country entity)
        {
            var datta = await _repositoryCountry.FirstOrDefaultAsync(x => x.Name == entity.Name);

            if (datta == null)
            {
                await _repositoryCountry.InsertAsync(entity);

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

        public async Task Update(Country entity)
        {
            await _repositoryCountry.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryCountry.GetAsync(id);
        }

        public async Task<Country> GetNationality(string nationality)
        {
            return await _repositoryCountry.FirstOrDefaultAsync(x=> x.Nationality == nationality);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryCountry.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryCountry.DeleteAsync(id);

        }
    }
}
