using Abp.Authorization;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.Controllers;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_CancelResults)]
public class SmCancelResultsPromotionsController : TopazERPControllerBase
{
    
    public IActionResult CancelResult()
    {
        return View();
    }

}
