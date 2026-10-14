using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TopazERP.Sessions.Dto;

namespace TopazERP.Web.Views.Shared.Components.TopazUserArea
{
    public class TopazUserAreaViewModel
    {
        public GetCurrentLoginInformationsOutput LoginInformations { get; set; }

        public bool IsMultiTenancyEnabled { get; set; }

        public string GetShownLoginName()
        {
            var userName = LoginInformations.User.UserName;

            if (!IsMultiTenancyEnabled)
            {
                return userName;
            }

            return LoginInformations.Tenant == null
                ? ".\\" + userName
                : LoginInformations.Tenant.TenancyName + "\\" + userName;
        }
    }
}
