using Abp.Domain.Repositories;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.OvertimeTimeSheets
{
   public class OvertimeTimeSheetManager : Abp.Domain.Services.DomainService, IOvertimeTimeSheetManager
    {
        private readonly IRepository<OvertimeTimeSheet, Guid> _repositoryOvertimeTimeSheet;

        public OvertimeTimeSheetManager(IRepository<OvertimeTimeSheet, Guid> repositoryOvertimeTimeSheet)
        {
            _repositoryOvertimeTimeSheet = repositoryOvertimeTimeSheet;
        }

        public async Task Create(OvertimeTimeSheet entity)
        {
            await _repositoryOvertimeTimeSheet.InsertAsync(entity);
        }

        public async Task Update(OvertimeTimeSheet entity)
        {
            await _repositoryOvertimeTimeSheet.UpdateAsync(entity);
        }

        public async Task<object> GetAsync(Guid id)
        {
            return await _repositoryOvertimeTimeSheet.FirstOrDefaultAsync(id);
        }

        public async Task<object> ListAll()
        {
            var data = await _repositoryOvertimeTimeSheet.GetAllListAsync();
            return data.OrderBy(a => a.EmployeeName).ToList();

        }

        public async Task<object> ListAll(int month,int year)
        {
            return await _repositoryOvertimeTimeSheet.GetAllListAsync(x=> x.Month == month && x.Year == year);
        }
        public async Task Delete(Guid id)
        {
            await _repositoryOvertimeTimeSheet.DeleteAsync(id);
        }
    }
}
