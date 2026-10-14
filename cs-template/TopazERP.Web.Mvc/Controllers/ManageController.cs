using Abp.Application.Services.Dto;
using Abp.AspNetCore.Mvc.Authorization;
using Abp.MultiTenancy;
using Abp.Web.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using TopazERP.Authorization;
using TopazERP.Authorization.Users;
using TopazERP.Controllers;
using TopazERP.DomainServices.Shared;
using TopazERP.Roles;
using TopazERP.Roles.Dto;
using TopazERP.Services.Shared.ReportDownloads;
using TopazERP.Users;
using TopazERP.Users.Dto;
using System;
using System.Dynamic;
using System.Threading.Tasks;
using System.Drawing.Printing;
using TopazERP.Auditing;

namespace TopazERP.Web.Controllers
{
    [AbpMvcAuthorize]
    public class ManageController : TopazERPControllerBase
    {
        private readonly UserManager _userManager;
        private readonly IUserAppService _userAppService;
        private readonly IRoleAppService _roleAppService;
        private readonly IAuditLogAppService _auditLogAppService;
        private readonly IConfiguration _configuration;
        private readonly IReportDownloadAppService _reportDownloadAppService;
        private readonly IFileManager _fileManager;
        public ManageController(UserManager userManager, IUserAppService userAppService, IRoleAppService roleAppService, IConfiguration configuration, IReportDownloadAppService reportDownloadAppService, IFileManager fileManager, IAuditLogAppService auditLogAppService)
        {
            _userManager = userManager;
            _userAppService = userAppService;
            _roleAppService = roleAppService;
            _configuration = configuration;
            _reportDownloadAppService = reportDownloadAppService;
            _fileManager = fileManager;
            _auditLogAppService = auditLogAppService;
        }

        public IActionResult Profile()
        {
            
            return View();
        }

        public IActionResult Subscription()
        {
            return View();
        }

        public IActionResult Billing()
        {
            return View();
        }

        
        public IActionResult Roles()
        {
            return View();
        }

        public IActionResult UpdatePassword()
        {
            return View();
        }

        public IActionResult AuditLogs()
        {
            return View();
        }


        public IActionResult AuditTrail()
        {
            return View();
        }

        public IActionResult CancelSubscription()
        {
            return View();
        }

        public IActionResult Users()
        {
            return View();
        }

        public async Task<IActionResult> Modules()
        {

            //var tentId = AbpSession.TenantId;
            //var iuserId = AbpSession.UserId.ToString();
            //var userId = int.Parse(iuserId);

            if (AbpSession.MultiTenancySide == MultiTenancySides.Host)
            {
                if (await IsGrantedAsync(PermissionNames.Pages_Tenants))
                {
                    return RedirectToAction("Index", "Tenants");
                }
                return RedirectToAction("Index", "HostDashboard");

            }
            else if (AbpSession.MultiTenancySide == MultiTenancySides.Tenant)
            {
                //var currentUser = await _userManager.GetUserByIdAsync(userId);

                //if (await _userManager.IsInRoleAsync(currentUser, "Admin"))
                //{

                //}
                return View();

            }

            return View();

        }

        public async Task<IActionResult> Downloads(int pageNo = 1, int pageSize = 10)
        {
            dynamic viewmodel = new ExpandoObject();
            var reportData = await _reportDownloadAppService.ListAll(pageNo, pageSize);

            viewmodel.PaginatedDownload = reportData;
            return View(viewmodel);
        }

        //api...

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> ValidateModuleAccess([FromQuery]int id)
        {
            await Task.Delay(1);
            string redirectUrl = string.Empty;

            //var isValidLicense = await _subscriptionAppService.ValidateModuleLicense(id);

            switch (id)
            {
                case TopazERPConsts.SchoolManager:
                    redirectUrl = "/dashboard/schoolmanager";
                    break;
                case TopazERPConsts.GeneralLedger:
                    redirectUrl = "/dashboard/generalledger";
                    break;
                case TopazERPConsts.Payroll:
                    redirectUrl = "/dashboard/Payroll";
                    break;
                case TopazERPConsts.StockManager:
                    redirectUrl = "/dashboard/stockmanager";
                    break;
                case TopazERPConsts.AssetManager:
                    redirectUrl = "/dashboard/assetmsanager";
                    break;
                case TopazERPConsts.AccountReceivables:
                    redirectUrl = "/dashboard/Ar";
                    break;
                case TopazERPConsts.AccountPayables:
                    redirectUrl = "/dashboard/Ap";
                    break;
                default:
                    break;
            }

            return Json(new { isValidLicense = true , redirectUrl });
        }
    
    
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<IActionResult> GetUserDetails()
        {
            long currentuser = Convert.ToInt64(AbpSession.UserId);

            var user = await _userAppService.GetUser(currentuser);
            var customer = new 
            {
                 user.PhoneNumber,
                user.UserName,
                user.EmailAddress,
                 user.Name,
                 user.Surname,
                user.IsEmailConfirmed,
                 user.IsPhoneNumberConfirmed,
                 user.Id, user.Roles

            };

            return Json(customer);

        }


        public async Task<IActionResult> UpdateUserDetails([FromBody] UserDto dto)
        {
             await _userAppService.UpdateAsync(dto);

            return Json(new {code = 200, message = "User profile updated successfully."});
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> ChangePassword([FromBody] ChangePasswordDto input)
        {
            var result = await _userAppService.ChangePassword(input);
            return Json(result);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetRoles([FromQuery] int pageNo, int pageSize)
        {

            var result = await _roleAppService.ListAll(pageNo, pageSize);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> AddRole([FromBody] CreateRoleDto dto)
        {
            var role = await _roleAppService.CreateAsync(dto) ;
            return Json(role);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> UpdateRole([FromBody] RoleDto dto)
        {
            var role = await _roleAppService.UpdateAsync(dto) ;
            return Json(role);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> DelRole([FromQuery] int id)
        {
              await _roleAppService.DeleteAsync(new EntityDto<int>(id));
              return Json(200);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetAllPermissionsForRole([FromQuery] string roleName)
        {
            var grantedPermissions = await _roleAppService.GetAllPermissionsForRole(roleName);

            return Json(grantedPermissions);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetUsers([FromQuery] int pageNo, int pageSize)
        {
            var result = await _userAppService.ListAll(pageNo, pageSize);
            return Json(result);
        }

        public async Task<JsonResult> AddUser([FromBody] CreateUserDto input)
        {
            await _userAppService.CreateAsync(input);
            return Json(200);
        }

        public async Task<JsonResult> EditUser([FromBody] UserDto input)
        {
            await _userAppService.UpdateAsync(input);
            return Json(200);
        }


        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> DelUser([FromQuery] long id)
        {
            var user = await _userAppService.GetAsync(new EntityDto<long>(id));

            await _userAppService.DeleteAsync(user);
            return Json(200);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<JsonResult> GetPermissions()
        {
            var permissions = (await _roleAppService.GetAllPermissions()).Items;

            return Json(permissions);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetAuditLogs([FromQuery] int pageNo, int pageSize)
        {
            var result = await _auditLogAppService.GetAll(pageNo, pageSize);
            return Json(result);
        }

        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> FilterAuditLogs([FromQuery] int pageNo, int pageSize, string startDate, string endDate, long? userId)
        {
            var result = await _auditLogAppService.GetAll(pageNo, pageSize, startDate, endDate, userId);
            return Json(result);
        }
        
        [WrapResult(WrapOnSuccess = false, WrapOnError = false)]
        public async Task<ActionResult> GetLogs(DateTime startDate, DateTime endDate)
        {
            var result = await _auditLogAppService.GetByDateRange(startDate, endDate);
            return Json(result);
        }

        public async Task<IActionResult> DownloadReportFile(string fileUrl)
        {
            byte[] fileBytes = await _fileManager.DownloadFileAsBytes(fileUrl);

            return File(fileBytes, "application/pdf", $"{Guid.NewGuid():N}.pdf");

        }
    }
}
