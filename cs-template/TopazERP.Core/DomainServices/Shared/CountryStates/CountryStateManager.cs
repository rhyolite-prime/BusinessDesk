using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.CountryStates
{
    public class CountryStateManager: Abp.Domain.Services.DomainService, ICountryStateManager
    {

        private readonly IRepository<CountryState, Guid> _repositoryCountryState;

        public CountryStateManager(IRepository<CountryState, Guid> repositoryCountryState)
        {
            _repositoryCountryState = repositoryCountryState;
        }

        public async Task<object> Create(CountryState entity)
        {
            var datta = await _repositoryCountryState.FirstOrDefaultAsync(x => x.CountryId == entity.CountryId && x.Name == entity.Name);

            if (datta == null)
            {
                await _repositoryCountryState.InsertAsync(entity);

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

        public async Task Update(CountryState entity)
        {
            await _repositoryCountryState.UpdateAsync(entity);
        }

        public async Task<object> ListAll()
        {
            return await _repositoryCountryState.GetAllListAsync();
        }
        public async Task Delete(Guid id)
        {
            await _repositoryCountryState.DeleteAsync(id);

        }
    }
}
