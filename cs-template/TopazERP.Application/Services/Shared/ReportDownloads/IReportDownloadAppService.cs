using Abp.Application.Services;
using TopazERP.DomainServices.Shared.ReportDownloads.Dto;
using TopazERP.Services.Shared.ReportDownloads.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.ReportDownloads
{
    public interface IReportDownloadAppService: IApplicationService
    {
        Task Create(CreateReportDownloadInput input);

        Task Update(Guid reportId, string filePath);

        Task<PaginatedDownload> ListAll(int pageNo, int pageSize);

    }
}
