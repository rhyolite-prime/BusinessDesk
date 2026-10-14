using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.FileTransfer
{
   public class FileTransferAppService: TopazERPAppServiceBase, IFileTransferAppService
    {
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly string _siteBaseUrl;

        public FileTransferAppService(IWebHostEnvironment webHostEnvironment, IConfiguration configuration)
        {
            _webHostEnvironment = webHostEnvironment;
            _siteBaseUrl = configuration["SiteBaseUrl"];
        }

        [HttpPost]
        public async Task<string> UploadFile([FromForm] IFormFile dataFile)
        {
            var watch = new System.Diagnostics.Stopwatch();
            watch.Start();

            var wwwRoot = _webHostEnvironment.WebRootPath;

            var fileName = Guid.NewGuid().ToString("N");

            var filepath = $"DataUpload/{fileName}.pdf";

            await using var fileStream = new FileStream(Path.Combine(wwwRoot + $"/DataUpload/{fileName}.pdf"), FileMode.Create, FileAccess.Write);
            await dataFile.CopyToAsync(fileStream);

            Logger.Info($"File Upload Execution Time: {watch.ElapsedMilliseconds} ms");

            return $"{_siteBaseUrl}{filepath}";
        }
    }
}
