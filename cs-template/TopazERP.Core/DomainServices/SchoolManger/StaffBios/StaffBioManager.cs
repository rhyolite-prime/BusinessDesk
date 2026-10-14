using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.UI;
using TopazERP.Models.Sch;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.SchoolManger.StaffBios
{
    public class StaffBioManager : Abp.Domain.Services.DomainService, IStaffBioManager
    {
        private readonly IRepository<StaffBio, Guid> _repositoryStaffBio;
        private readonly IRepository<SystemNumber, Guid> _repositorySystemNumber;

        public StaffBioManager(IRepository<StaffBio, Guid> repositoryStaffBio, IRepository<SystemNumber, Guid> repositorySystemNumber)
        {
            _repositoryStaffBio = repositoryStaffBio;
            _repositorySystemNumber = repositorySystemNumber;
        }

        public async Task<object> Create(StaffBio entity)
        {
            var data = await _repositoryStaffBio.FirstOrDefaultAsync(x => x.StaffIdentifier == entity.StaffIdentifier);
            
            if (data == null)
            {
                if (string.IsNullOrWhiteSpace(entity.StaffIdentifier) || entity.StaffIdentifier.Trim() == "0")
                {
                    entity.StaffIdentifier = await GenerateStaffIdAsync();
                }
                await _repositoryStaffBio.InsertAsync(entity);
                return new { code = 200, message = "successful", id =  entity.Id };
            }
            else
            {
                return new { code = 400, message = "Duplicate Staff Identifier not allowed." };
            }
        }

        public async Task Update(StaffBio entity)
        {
            await _repositoryStaffBio.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repositoryStaffBio.GetAllListAsync();
            return data.OrderBy(x => x.LastName).ThenBy(x => x.FirstName).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repositoryStaffBio.DeleteAsync(id);
        }
        public async Task<StaffBio> GetById(Guid id)
        {
            return await _repositoryStaffBio.GetAsync(id);
        }
        
        
        public async Task<string> GenerateStaffIdAsync()
        {
            var systemNumbers = await _repositorySystemNumber.GetAllListAsync();
            var systemNumber = systemNumbers.FirstOrDefault(sn => sn.ItemName == "SM-StaffID");

            if (systemNumber == null)
            {
                throw new UserFriendlyException(
                    "Please set up StaffI(SM-StaffID) in System Numbers."
                );
            }

            string staffId;
            bool isDuplicate;

            do
            {
                staffId = $"{systemNumber.Prefix}{systemNumber.LastNo}{systemNumber.Suffix}";
            
                isDuplicate = await _repositoryStaffBio.CountAsync(x => x.StaffIdentifier == staffId) > 0;

                if (isDuplicate)
                {
                    systemNumber.LastNo += 1;
                }
            } while (isDuplicate);

            // Update the system number in the database
            systemNumber.LastNo += 1;
            await _repositorySystemNumber.UpdateAsync(systemNumber);

            return staffId;
        }
    }
}