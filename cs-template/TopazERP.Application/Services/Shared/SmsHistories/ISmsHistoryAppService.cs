using Abp.Application.Services;
using TopazERP.Services.Shared.SmsHistories.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.SmsHistories
{
   public interface ISmsHistoryAppService: IApplicationService
    {
        Task Create(SmsHistoryInput input);
        Task<object> ListAll(DateTime startDate, DateTime endDate);
    }
}
