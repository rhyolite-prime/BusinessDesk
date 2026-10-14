using Abp.Application.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.FileTransfer
{
   public interface IFileTransferAppService: IApplicationService
    {
        Task<string> UploadFile([FromForm] IFormFile dataFile);
    }
}
