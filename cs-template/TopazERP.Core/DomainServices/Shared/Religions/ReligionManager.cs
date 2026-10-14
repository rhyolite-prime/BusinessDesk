using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Religions
{
   public class ReligionManager: Abp.Domain.Services.DomainService, IReligionManager
    {
        private readonly IRepository<Religion, Guid> _repositoryReligion;

        public ReligionManager(IRepository<Religion, Guid> repositoryReligion)
        {
            _repositoryReligion = repositoryReligion;
        }

        public async Task<object> Create(Religion entity)
        {
            var datta = await _repositoryReligion.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (datta == null)
            {
                await _repositoryReligion.InsertAsync(entity);

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

        public async Task Update(Religion entity)
        {
            await _repositoryReligion.UpdateAsync(entity);
        }

        public async Task<Religion> GetAsync(string name)
        {
            return await _repositoryReligion.FirstOrDefaultAsync(x => x.Name == name);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repositoryReligion.GetAllListAsync();
            return data.OrderBy(data => data.Name).ToList();

        }
        public async Task Delete(Guid id)
        {
            await _repositoryReligion.DeleteAsync(id);

        }

    }
}
