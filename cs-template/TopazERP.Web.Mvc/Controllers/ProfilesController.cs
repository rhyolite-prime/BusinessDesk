using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;

namespace TopazERP.Web.Controllers;

public class ProfilesController : TopazERPControllerBase
{
    public ActionResult SchoolProfile()
    {
        return View();
    }
}