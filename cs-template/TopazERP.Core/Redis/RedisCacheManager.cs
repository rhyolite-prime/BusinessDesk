using Abp.Domain.Services;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Redis
{
   public class RedisCacheManager: DomainService, IRedisCacheManager
    {
        private readonly IConnectionMultiplexer _connectionMultiplexer;

        public RedisCacheManager(IConnectionMultiplexer connectionMultiplexer)
        {
            _connectionMultiplexer = connectionMultiplexer;
        }

        public async Task SetValueAsync(int dbNumber, string key, string value)
        {
            Logger.Info($"Set value={value} with Key={key}");
            var db = _connectionMultiplexer.GetDatabase(dbNumber);
            await db.StringSetAsync(key, value);
        }

        public async Task SetExpireTimeAsync(int dbNumber, string key, TimeSpan expiryTime)
        {
            Logger.Info($"Set Expiry Time value={expiryTime} with Key={key}");
            var db = _connectionMultiplexer.GetDatabase(dbNumber);
            await db.KeyExpireAsync(key, expiryTime);
        }

        public async Task RemoveValueAsync(int dbNumber, string key)
        {
            Logger.Info($"Remove value with Key={key}");
            var db = _connectionMultiplexer.GetDatabase(dbNumber);
            await db.KeyDeleteAsync(key);
            Logger.Info($"Key={key} was removed");
        }

        public async Task<string> GetValueAsync(int dbNumber, string key, bool shouldRemove = false)
        {
            Logger.Info($"Get value with Key={key}");
            var db = _connectionMultiplexer.GetDatabase(dbNumber);

            var value = await db.StringGetAsync(key);
            if (shouldRemove)
            {
                db.KeyDelete(key);
                Logger.Info($"Key={key} was removed");

            }


            return value;
        }
    }
}
