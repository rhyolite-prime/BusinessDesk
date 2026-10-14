using Microsoft.AspNetCore.Mvc;

namespace TopazERP.Web.Controllers;

public class SmSMSController : TopazERP.Controllers.TopazERPControllerBase
{
    public IActionResult Sms()
    {
        return View();
    }
}