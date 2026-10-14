using Abp.Auditing;
using Abp.Domain.Repositories;
using Abp.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.AuditLogs
{
    public class AuditLogManager: Abp.Domain.Services.DomainService, IAuditLogManager
    {
        private readonly IRepository<AuditLog, long> _auditLogRepository;

        public AuditLogManager(IRepository<AuditLog, long> auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public async Task<object> GetAll(int pageNo, int pageSize)
        {

            var totalCount =
               await _auditLogRepository.CountAsync();

            var data = await _auditLogRepository.GetAll()
                .OrderByDescending(x => x.ExecutionTime)
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var totalPages = totalCount > 0 ? Convert.ToInt32(Math.Ceiling(totalCount / (decimal)pageSize)) : 0;

            var paginatedResult = new
            {
                pageNo,
                totalCount,
                totalPages,
                data,
                lowerBound = pageSize * (pageNo - 1) + 1,
                upperBound = totalPages == pageNo ? totalCount : pageNo * pageSize,

            };

            return paginatedResult;

        }

        public async Task<object> GetAll(int pageNo, int pageSize, string startDate, string endDate, long? userId)
        {

            var predicate = PredicateBuilder.New<AuditLog>();

            if (!string.IsNullOrEmpty(startDate))
            {
                predicate.And(x => x.ExecutionTime.Date >= Convert.ToDateTime(startDate).Date);

            }

            if (!string.IsNullOrEmpty(endDate))
            {
                predicate.And(x => x.ExecutionTime.Date <= Convert.ToDateTime(endDate).Date);

            }

            if (userId != null)
            {
                predicate.And(x => x.UserId == userId);
            }

            var totalCount =
               await _auditLogRepository.CountAsync(predicate);

            var data = await _auditLogRepository.GetAll()
                .OrderByDescending(x => x.ExecutionTime) 
                .Skip((pageNo - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var totalPages = totalCount > 0 ? Convert.ToInt32(Math.Ceiling(totalCount / (decimal)pageSize)) : 0;

            
            var paginatedResult = new
            {
                pageNo,
                totalCount,
                totalPages,
                data,
                lowerBound = pageSize * (pageNo - 1) + 1,
                upperBound = totalPages == pageNo ? totalCount : pageNo * pageSize,

            };

            return paginatedResult;

        }

        public async Task<object> GetByDateRange(DateTime startDate, DateTime endDate)
        {
            var endDateInclusive = endDate.Date.AddDays(1);

            var data = await _auditLogRepository.GetAll()
                .Where(x =>
                    x.ExecutionTime >= startDate.Date &&
                    x.ExecutionTime < endDateInclusive
                )
                .OrderByDescending(x => x.ExecutionTime)
                .Select(x => new
                {
                    x.Id,
                    x.TenantId,
                    x.UserId,
                    x.ServiceName,
                    x.MethodName,
                    x.Parameters,
                    x.ReturnValue,
                    x.ExecutionTime,
                    x.ExecutionDuration,
                    x.ClientIpAddress,
                    x.ClientName,
                    x.BrowserInfo,
                    x.Exception,
                    x.ExceptionMessage,

                    Status = x.Exception == null
                        ? "Success"
                        : "Failed"
                })
                .ToListAsync();

            return data;
        }
    }
}
