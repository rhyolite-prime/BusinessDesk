using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.AuditLogs;

namespace TopazERP.Auditing
{
    public class AuditLogAppService: TopazERPAppServiceBase, IAuditLogAppService
    {

        private readonly IAuditLogManager _auditLogManager;

        public AuditLogAppService(IAuditLogManager auditLogManager)
        {
            _auditLogManager = auditLogManager;
        }

        public async Task<object> GetAll(int pageNo, int pageSize)
        {
            return await _auditLogManager.GetAll(pageNo, pageSize);
        }

        public async Task<object> GetAll(int pageNo, int pageSize, string startDate, string endDate, long? userId)
        {
            return await _auditLogManager.GetAll(pageNo, pageSize, startDate, endDate, userId);
        }

        public async Task<object> GetByDateRange(DateTime startDate, DateTime endDate)
        {
            return await _auditLogManager.GetByDateRange(startDate, endDate);
        }
    }
}
