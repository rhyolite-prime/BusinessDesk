using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;

namespace TopazERP.Web.Controllers
{
    public class PayrollMessagingController : TopazERPControllerBase
    {
        public IActionResult Staff()
        {
            return View();
        }

        public IActionResult ResendPaySlips()
        {
            return View();
        }

        public IActionResult Templates()
        {
            return View();
        }

        public IActionResult TokenExpressions()
        {
            return View();
        }

        public IActionResult Reports()
        {
            return View();
        }


    }
}
