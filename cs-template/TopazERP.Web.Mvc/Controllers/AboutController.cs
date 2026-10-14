using Microsoft.AspNetCore.Mvc;
using Abp.AspNetCore.Mvc.Authorization;
using TopazERP.Controllers;

namespace TopazERP.Web.Controllers
{
    [AbpMvcAuthorize]
    public class AboutController : TopazERPControllerBase
    {
        public ActionResult Index()
        {
            return View();
        }
	}
}
