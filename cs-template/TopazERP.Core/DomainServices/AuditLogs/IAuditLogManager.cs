using Abp.Domain.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.AuditLogs
{
    public interface IAuditLogManager : IDomainService
    {
        Task<object> GetAll(int pageNo, int pageSize);
        Task<object> GetAll(int pageNo, int pageSize, string startDate, string endDate, long? userId);

        Task<object> GetByDateRange(DateTime startDate, DateTime endDate);
    }
}
