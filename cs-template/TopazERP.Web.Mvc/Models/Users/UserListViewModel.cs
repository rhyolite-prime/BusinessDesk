using System.Collections.Generic;
using TopazERP.Roles.Dto;

namespace TopazERP.Web.Models.Users
{
    public class UserListViewModel
    {
        public IReadOnlyList<RoleDto> Roles { get; set; }
    }
}
