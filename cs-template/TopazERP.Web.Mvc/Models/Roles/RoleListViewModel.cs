using System.Collections.Generic;
using TopazERP.Roles.Dto;

namespace TopazERP.Web.Models.Roles
{
    public class RoleListViewModel
    {
        public IReadOnlyList<PermissionDto> Permissions { get; set; }
    }
}
