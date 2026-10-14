using System.Threading.Tasks;
using Abp.Authorization;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Authorization;
using TopazERP.Controllers;
using TopazERP.Models.Shared;
using TopazERP.Services.Ap.ApVouchers;
using TopazERP.Services.Shared.CompanyProfiles;

namespace TopazERP.Web.Controllers;

[AbpAuthorize(PermissionNames.Ap_EnterpriseDataEntry)]
public class ApEnterpriseDataEntry: TopazERPControllerBase
{
    private readonly IApVoucherAppService _apVoucherAppService;
    private readonly ICompanyProfileAppService _companyProfileAppService;

    public ApEnterpriseDataEntry(IApVoucherAppService apVoucherAppService, ICompanyProfileAppService companyProfileAppService)
    {
        _apVoucherAppService = apVoucherAppService;
        _companyProfileAppService = companyProfileAppService;
    }

    [AbpAuthorize(PermissionNames.Ap_EnterpriseDataEntry_Vouchers)]
    public async Task<ActionResult> RaiseVoucher()
    {
        var result = await _companyProfileAppService.GetProfile();
        var profile = result as CompanyProfile;

        if (profile?.IsTaxLeviesInclusive == false)
        {
            TempData["Message"] = "Access to this page is denied!, Please contact your system administrator.";
                
        }

        return View();
    }
    
    [AbpAuthorize(PermissionNames.Ap_EnterpriseDataEntry_PostVouchers)]
    public async Task<ActionResult> PostVoucher()
    {
        var result = await _companyProfileAppService.GetProfile();
        var profile = result as CompanyProfile;

        if (profile?.IsTaxLeviesInclusive == false)
        {
            TempData["Message"] = "Access to this page is denied!, Please contact your system administrator.";
                
        }

        return View();
    }
    
}