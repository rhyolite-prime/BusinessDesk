using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.ReportDownloads.Dto
{
    public class CreateReportDownloadInput
    {
        public string Name { get; set; }
        public string ReportKey { get; set; }
        public string ReportOptions { get; set; }
        public DateTime Date { get; set; }
        public string RequestedBy { get; set; }
        public string Status { get; set; }
        public int TenantId { get; set; }
        public string AccountSource { get; set; }
        public string ReportStorageBaseUrl { get; set; }
        public string ReportFilePath { get; set; }
    }
}
