using Abp.Domain.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.RabbitMq
{
    public interface IRabbitMqClient:IDomainService
    {
        void Produce(string exchangeName, string queueName, object message);

    }
}
