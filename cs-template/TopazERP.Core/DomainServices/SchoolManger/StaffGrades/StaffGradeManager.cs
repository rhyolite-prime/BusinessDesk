using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffGrades
{
    public class StaffGradeManager : Abp.Domain.Services.DomainService, IStaffGradeManager
    {
        private readonly IRepository<StaffGrade, Guid> _repositoryStaffGrade;

        public StaffGradeManager(IRepository<StaffGrade, Guid> repositoryStaffGrade)
        {
            _repositoryStaffGrade = repositoryStaffGrade;
        }

        public async Task<object> Create(StaffGrade entity)
        {
            var data = await _repositoryStaffGrade.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

            if (data == null)
            {
                await _repositoryStaffGrade.InsertAsync(entity);
                return new { code = 200, message = "successful" };
            }
            else
            {
                return new { code = 400, message = "Duplicate records are not allowed." };
            }
        }

        public async Task Update(StaffGrade entity)
        {
            await _repositoryStaffGrade.UpdateAsync(entity);
        }

        public async Task<IEnumerable<object>> ListAll()
        {
            var data = await _repositoryStaffGrade.GetAllListAsync();
            return data.OrderBy(x => x.Name).ToList();
        }

        public async Task Delete(Guid id)
        {
            await _repositoryStaffGrade.DeleteAsync(id);
        }
    }
}