using System.Threading.Tasks;
using Abp.Application.Services;
using Abp.Application.Services.Dto;
using TopazERP.Authorization.Users;
using TopazERP.Roles.Dto;
using TopazERP.Users.Dto;

namespace TopazERP.Users
{
    public interface IUserAppService : IAsyncCrudAppService<UserDto, long, PagedUserResultRequestDto, CreateUserDto, UserDto>
    {
        Task DeActivate(EntityDto<long> user);
        Task Activate(EntityDto<long> user);
        Task<ListResultDto<RoleDto>> GetRoles();
        Task ChangeLanguage(ChangeUserLanguageDto input);

        Task<bool> ChangePassword(ChangePasswordDto input);

        Task<User> GetUser(long Id);
        // getallusers
        
        Task<object> ListAll(int pageNo, int pageSize);
        Task<object> GetAll();
    }
}
