using Microsoft.AspNetCore.Mvc;

namespace TopazERP.Web.Controllers;

public class LedgerSharedResourceController : TopazERP.Controllers.TopazERPControllerBase
{
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

    public IActionResult Suppliers()
    {
        return View();
    }

    public IActionResult Nationalities()
    {
        return View();
    }
}