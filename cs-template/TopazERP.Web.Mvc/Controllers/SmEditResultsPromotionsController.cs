using Abp.Authorization;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.Controllers;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Sm_PromotionsAndResults_EditResults)]
public class SmEditResultsPromotionsController: TopazERPControllerBase
{
    public IActionResult EditClassAssignment1()
    {
        return View();
    }

    public IActionResult EditClassAssignment2()
    {
        return View();
    }

    public IActionResult EditClassAssignment3()
    {
        return View();
    }

    public IActionResult EditClassAssignment4()
    {
        return View();
    }
    public IActionResult EditExam()
    {
        return View();
    }
    public IActionResult EditMidTerm()
    {
        return View();
    }
    
}