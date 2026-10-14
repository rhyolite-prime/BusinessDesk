using System.Collections.Generic;
using TopazERP.Roles.Dto;

namespace TopazERP.Web.Models.Common
{
    public interface IPermissionsEditViewModel
    {
        List<FlatPermissionDto> Permissions { get; set; }
    }
}