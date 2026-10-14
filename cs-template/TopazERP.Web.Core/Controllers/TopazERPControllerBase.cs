using Abp.AspNetCore.Mvc.Controllers;
using Abp.IdentityFramework;
using Microsoft.AspNetCore.Identity;

namespace TopazERP.Controllers
{
    public abstract class TopazERPControllerBase: AbpController
    {
        protected TopazERPControllerBase()
        {
            LocalizationSourceName = TopazERPConsts.LocalizationSourceName;
        }

        protected void CheckErrors(IdentityResult identityResult)
        {
            identityResult.CheckErrors(LocalizationManager);
        }
    }
}
