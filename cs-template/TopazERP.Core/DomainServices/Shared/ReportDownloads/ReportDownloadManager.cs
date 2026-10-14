using Abp.Domain.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TopazERP.DomainServices.Shared.ReportDownloads.Dto;
using TopazERP.Models.Shared;
using TopazERP.RabbitMq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.ReportDownloads
{
    public class ReportDownloadManager: Abp.Domain.Services.DomainService, IReportDownloadManager
    {
        private readonly IRepository<ReportDownload, Guid> _repositoryReportDownload;
        private readonly IRabbitMqClient _rabbitMqClient;
        private readonly string _exchangeName;
        private readonly string _queueName;
        private readonly string _siteBaseUrl;
        public ReportDownloadManager(IRepository<ReportDownload, Guid> repositoryReportDownload, IConfiguration configuration, IRabbitMqClient rabbitMqClient)
        {
            _repositoryReportDownload = repositoryReportDownload;
            _rabbitMqClient = rabbitMqClient;
            _exchangeName = configuration["RabbitMqBroker:ExchangeTypes:AmqTopic"];
            _queueName = configuration["RabbitMqBroker:ReportDownloadQueue"];
            _siteBaseUrl = configuration["SiteBaseUrl"];
        }

        public async Task Create(ReportDownload entity)
        {
            entity.ReportStorageBaseUrl = _siteBaseUrl;
            entity.ReportServiceBaseUrl = _siteBaseUrl;

            var report = await _repositoryReportDownload.InsertAsync(entity);

            //produce report download consumer to prepare download
            _rabbitMqClient.Produce(_exchangeName, _queueName, report);
        }


        public async Task Update(Guid reportId, string filePath)
        {
            var report = await _repositoryReportDownload.FirstOrDefaultAsync(reportId);
            report.ReportFilePath = filePath;
            report.Status = "Ready";
            await _repositoryReportDownload.UpdateAsync(report);

        }


        public async Task<PaginatedDownload> ListAll(int pageNo, int pageSize)
        {
            var totalCount =
                await _repositoryReportDownload.CountAsync();

            var data = await _repositoryReportDownload.GetAll().Skip((pageNo - 1) * pageSize).Take(pageSize).ToListAsync();


            var downloadResult = new PaginatedDownload
            {
                PageNo = pageNo,
                TotalCount = totalCount,
                TotalPages = totalCount > 0 ? Convert.ToInt32(Math.Ceiling(totalCount / (decimal)pageSize)) : 0,
                Downloads = data

            };

            return downloadResult;
        }

    }
}
