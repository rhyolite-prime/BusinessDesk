using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.SmsHistories
{
   public interface ISmsHistoryManager : Abp.Domain.Services.IDomainService
    {
        Task Create(SmsHistory entity);
        Task<object> ListAll(DateTime startDate, DateTime endDate);

    }
}
