using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.InitializePayMonths
{
   public interface IInitializePayMonthManager : Abp.Domain.Services.IDomainService
    {
        Task<object> GetData();
        Task Create(InitializePayMonth entity);
    }
}
