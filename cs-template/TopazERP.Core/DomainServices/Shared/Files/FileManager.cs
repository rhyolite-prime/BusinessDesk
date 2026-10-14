using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Files
{
   public class FileManager:  Abp.Domain.Services.DomainService, IFileManager
    {
        public async Task<byte[]> DownloadFileAsBytes(string url)
        {
            using var client = new HttpClient();
            var bytes = await client.GetByteArrayAsync(url);
            return bytes;
            //return $"image/jpeg;base64,{Convert.ToBase64String(bytes)}";
        }
    }
}
