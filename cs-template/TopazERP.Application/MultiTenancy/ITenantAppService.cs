using Abp.Application.Services;
using TopazERP.MultiTenancy.Dto;

namespace TopazERP.MultiTenancy
{
    public interface ITenantAppService : IAsyncCrudAppService<TenantDto, int, PagedTenantResultRequestDto, CreateTenantDto, TenantDto>
    {
    }
}

