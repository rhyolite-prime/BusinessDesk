using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Cities
{
    public class CityManager: Abp.Domain.Services.DomainService, ICityManager
    {

        private readonly IRepository<City, Guid> _repositoryCity;
        private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;

        public CityManager(IRepository<City, Guid> repositoryCity, IRepository<CompanyProfile, Guid> repositoryCompanyProfile)
        {
            _repositoryCity = repositoryCity;
            _repositoryCompanyProfile = repositoryCompanyProfile;
        }

        public async Task<object> Create(City entity)
        {
            var datta = await _repositoryCity.FirstOrDefaultAsync(x => x.CountryId == entity.CountryId && x.CountryStateId == entity.CountryStateId && x.Name == entity.Name);

            if (datta == null)
            {
                await _repositoryCity.InsertAsync(entity);

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

        public async Task Update(City entity)
        {
            await _repositoryCity.UpdateAsync(entity);
        }

        public async Task<object> ListAll()
        {
            /*// use default country set on company profile
            var companyProfile =  _repositoryCompanyProfile.GetAll().FirstOrDefault();
            if (companyProfile != null)
            {
                return await _repositoryCity.GetAllListAsync(x=>x.CountryId == companyProfile.CountryId);
            }*/

            return await _repositoryCity.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryCity.DeleteAsync(id);

        }
    }
}
