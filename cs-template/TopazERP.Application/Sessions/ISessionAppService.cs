using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Sessions.Dto;

namespace TopazERP.Sessions
{
    public interface ISessionAppService : IApplicationService
    {
        Task<GetCurrentLoginInformationsOutput> GetCurrentLoginInformations();
    }
}
