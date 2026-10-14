using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Uow;
using TopazERP.DomainServices.Payroll.SetupIntegrityGuard;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Shared.PersonnelStatuses;

public class PersonnelStatusManager: Abp.Domain.Services.DomainService, IPersonnelStatusManager
{
    
        private readonly IRepository<PersonnelStatus, Guid> _repositoryPersonnelStatus;
        private readonly ISetupIntegrityGuardManager _setupIntegrityGuardManager;
        
        public PersonnelStatusManager(IRepository<PersonnelStatus, Guid> repositoryPersonnelStatus, ISetupIntegrityGuardManager setupIntegrityGuardManager)
        {
            _repositoryPersonnelStatus = repositoryPersonnelStatus;
            _setupIntegrityGuardManager = setupIntegrityGuardManager;
        }

        public async Task<object> Create(PersonnelStatus entity)
        {
            var datta = await _repositoryPersonnelStatus.FirstOrDefaultAsync(x => x.Name.ToLower().Trim() == entity.Name.ToLower().Trim());

            if (datta == null)
            {
                var isdefaultRow = await _repositoryPersonnelStatus.FirstOrDefaultAsync(x => x.IsDefault == entity.IsDefault);

                if (isdefaultRow == null)
                {
                    
                    await _repositoryPersonnelStatus.InsertAsync(entity);

                    var dupObj = new
                    {
                        IsDuplicate = false,
                        IsDefaultDuplicate = false
                    };

                    return dupObj;

                }
                else if (isdefaultRow != null && entity.IsDefault)
                {
                    var dupObj = new
                    {
                        IsDuplicate = false,
                        IsDefaultDuplicate = true
                    };
                    return dupObj;
                }
                else
                {

                    await _repositoryPersonnelStatus.InsertAsync(entity);

                    var dupObj = new
                    {
                        IsDuplicate = false,
                        IsDefaultDuplicate = false
                    };

                    return dupObj;
                }

            }
            else
            {
                var dupObj = new
                {
                    IsDuplicate = true,
                    IsDefaultDuplicate = false
                };

                return dupObj;
            }
        }

         

        public async Task<IEnumerable<object>> ListAll()
        {
            return await _repositoryPersonnelStatus.GetAllListAsync();
        }
        
        public async Task<PersonnelStatus> GetAsync(string statusName)
        {
            return await _repositoryPersonnelStatus.FirstOrDefaultAsync(x=> x.Name == statusName);
        }

        public async Task<bool> Delete(Guid id)
        {
            
            var hasPassedIntegrity = await _setupIntegrityGuardManager.ValidateIntegrity(id, "PersonnelStatus");
            
            if (hasPassedIntegrity)
            {
                await _repositoryPersonnelStatus.DeleteAsync(id);
            }

            return hasPassedIntegrity;
            
        }

        public async Task Update(PersonnelStatus entity)
        {

            await _repositoryPersonnelStatus.UpdateAsync(entity);
            

            var personnelStatusList = await _repositoryPersonnelStatus.GetAllListAsync(x=> x.Id != entity.Id);
            
            foreach (var personnelStatus in personnelStatusList)
            {
                personnelStatus.IsDefault = false;
                await _repositoryPersonnelStatus.UpdateAsync(personnelStatus);
            }

            

        }

    }
