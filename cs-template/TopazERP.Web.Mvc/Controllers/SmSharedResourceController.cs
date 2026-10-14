using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace TopazERP.Web.Controllers
{
    [Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
    public class SmSharedResourceController : TopazERPControllerBase
    {
        public IActionResult Relationships()
        {
            return View();
        }

        public IActionResult Religions()
        {
            return View();
        }

        public IActionResult Currencies()
        {
            return View();
        }

        public IActionResult SystemNumbers()
        {
            return View();
        }

        public IActionResult BanksBranches()
        {
            return View();
        }
        public IActionResult Nationalities()
        {
            return View();
        }
        
    }
}
