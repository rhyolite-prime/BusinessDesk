using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SchoolGroups;

public class SchoolGroupManager : Abp.Domain.Services.DomainService, ISchoolGroupManager
    {
        private readonly IRepository<SchoolGroup, Guid> _repositorySchoolGroup;
        private readonly IRepository<SchoolGroupPosition, Guid> _repositorySchoolGroupPosition;

        public SchoolGroupManager(
            IRepository<SchoolGroup, Guid> repositorySchoolGroup,
            IRepository<SchoolGroupPosition, Guid> repositorySchoolGroupPosition)
        {
            _repositorySchoolGroup = repositorySchoolGroup;
            _repositorySchoolGroupPosition = repositorySchoolGroupPosition;
        }

        // =======================
        // SCHOOL GROUP MANAGEMENT
        // =======================

        public async Task<object> CreateGroup(SchoolGroup entity)
        {
            var data = await _repositorySchoolGroup.FirstOrDefaultAsync(
                x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() && x.StaffId == entity.StaffId
            );

            if (data == null)
            {
                await _repositorySchoolGroup.InsertAsync(entity);
                return new { code = 200, message = "School group created successfully." };
            }

            return new { code = 400, message = "Duplicate school group not allowed." };
        }

        public async Task UpdateGroup(SchoolGroup entity)
        {
            await _repositorySchoolGroup.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAllGroups()
        {
            var data = await _repositorySchoolGroup.GetAllListAsync();
            return data.OrderBy(d => d.Name).ToList();
        }

        public async Task DeleteGroup(Guid id)
        {
            await _repositorySchoolGroup.DeleteAsync(id);
        }

        // ==========================
        // SCHOOL GROUP POSITION MANAGEMENT
        // ==========================

        public async Task<object> CreatePosition(SchoolGroupPosition entity)
        {
            var data = await _repositorySchoolGroupPosition.FirstOrDefaultAsync(
                x => x.Name == entity.Name && x.SchoolGroupId == entity.SchoolGroupId
            );

            if (data == null)
            {
                await _repositorySchoolGroupPosition.InsertAsync(entity);
                return new { code = 200, message = "Position created successfully." };
            }

            return new { code = 400, message = "Duplicate position not allowed." };
        }

        public async Task UpdatePosition(SchoolGroupPosition entity)
        {
            await _repositorySchoolGroupPosition.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAllPositions()
        {
            var data = await _repositorySchoolGroupPosition.GetAllListAsync();
            return data.OrderBy(d => d.Name).ToList();
        }

        public async Task DeletePosition(Guid id)
        {
            await _repositorySchoolGroupPosition.DeleteAsync(id);
        }
    }