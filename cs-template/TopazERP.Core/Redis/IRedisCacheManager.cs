using Abp.Domain.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Redis
{
   public interface IRedisCacheManager: IDomainService
    {
        Task SetValueAsync(int dbNumber, string key, string value);
        Task SetExpireTimeAsync(int dbNumber, string key, TimeSpan expiryTime);
        Task RemoveValueAsync(int dbNumber, string key);
        Task<string> GetValueAsync(int dbNumber, string key, bool shouldRemove = false);
    }
}
