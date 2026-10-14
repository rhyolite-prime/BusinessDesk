using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.InitializePayMonths
{
   public class InitializePayMonthManager: Abp.Domain.Services.DomainService, IInitializePayMonthManager
    {
        private readonly IRepository<InitializePayMonth, Guid> _repositoryInitializePayMonth;

        public InitializePayMonthManager(IRepository<InitializePayMonth, Guid> repositoryInitializePayMonth)
        {
            _repositoryInitializePayMonth = repositoryInitializePayMonth;
        }
        public async Task<object> GetData()
        {
            return await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();
        }


        public async Task Create(InitializePayMonth entity)
        {
            var datta = await _repositoryInitializePayMonth.GetAll().FirstOrDefaultAsync();
            
            if (datta != null)
            {
                datta.Month = entity.Month;
                datta.Year = entity.Year;

                await _repositoryInitializePayMonth.UpdateAsync(datta);
            }
            else
            {
                await _repositoryInitializePayMonth.InsertAsync(entity);
            }

        }
    }
}
