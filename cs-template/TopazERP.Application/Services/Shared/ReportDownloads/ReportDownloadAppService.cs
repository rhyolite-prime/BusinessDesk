using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using TopazERP.DomainServices.Shared.ReportDownloads;
using TopazERP.DomainServices.Shared.ReportDownloads.Dto;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.ReportDownloads.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.ReportDownloads
{
    public class ReportDownloadAppService: TopazERPAppServiceBase, IReportDownloadAppService
    {

        private readonly IReportDownloadManager _reportDownloadManager;
        private readonly IMapper _mapper;

        public ReportDownloadAppService(IReportDownloadManager reportDownloadManager, IMapper mapper)
        {
            _reportDownloadManager = reportDownloadManager;
            _mapper = mapper;
        }

        [HttpPost]
        public async Task Create(CreateReportDownloadInput input)
        {
            var obj = _mapper.Map<ReportDownload>(input);
            await _reportDownloadManager.Create(obj);

        }


        [HttpGet]
        public async Task Update(Guid reportId, string filePath)
        {
            await _reportDownloadManager.Update(reportId, filePath);

        }

        [HttpGet]
        public async Task<PaginatedDownload> ListAll(int pageNo, int pageSize)
        {
            return await _reportDownloadManager.ListAll(pageNo,pageSize);
        }
    }
}
