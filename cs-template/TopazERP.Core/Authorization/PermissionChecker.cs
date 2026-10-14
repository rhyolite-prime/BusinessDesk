using Abp.Authorization;
using TopazERP.Authorization.Roles;
using TopazERP.Authorization.Users;

namespace TopazERP.Authorization
{
    public class PermissionChecker : PermissionChecker<Role, User>
    {
        public PermissionChecker(UserManager userManager)
            : base(userManager)
        {
        }
    }
}
