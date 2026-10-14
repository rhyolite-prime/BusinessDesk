using Microsoft.AspNetCore.Mvc;
using TopazERP.Controllers;

namespace TopazERP.Web.Controllers
{
    [Abp.AspNetCore.Mvc.Authorization.AbpMvcAuthorize]
    public class ArSharedResourceController: TopazERPControllerBase
    {
        public IActionResult DefaultGlNumbers()
        {
            return View();
        }
        
        public IActionResult CompanyProfile()
        {
            return View();
        }
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

        public IActionResult SupplierGroups()
        {
            return View();
        }

        public IActionResult CustomerGroups()
        {
            return View();
        }

        public IActionResult Departments()
        {
            return View();
        }

        public IActionResult CostCenters()
        {
            return View();
        }
        public IActionResult BanksBranches()
        {
            return View();
        }

        public IActionResult Customers()
        {
            return View();
        }

        public IActionResult Nationalities()
        {
            return View();
        }
        public ActionResult Titles()
        {
            return View();
        }
        public ActionResult Suffixes()
        {
            return View();
        }
        public ActionResult Designations()
        {
            return View();
        }
        public ActionResult TypesOfAddresses()
        {
            return View();
        }
        
        public ActionResult TypesOfPhones()
        {
            return View();
        }
        
        public ActionResult JobTitles()
        {
            return View();
        }
        
        public ActionResult Statuses()
        {
            return View();
        }

    
    }
}

