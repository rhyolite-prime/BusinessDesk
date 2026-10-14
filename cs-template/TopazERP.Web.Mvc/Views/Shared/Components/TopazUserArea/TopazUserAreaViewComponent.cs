using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Configuration.Startup;
using Microsoft.AspNetCore.Mvc;
using TopazERP.Sessions;

namespace TopazERP.Web.Views.Shared.Components.TopazUserArea
{
    public class TopazUserAreaViewComponent: TopazERPViewComponent
    {
        private readonly ISessionAppService _sessionAppService;
        private readonly IMultiTenancyConfig _multiTenancyConfig;

        public TopazUserAreaViewComponent(
            ISessionAppService sessionAppService,
            IMultiTenancyConfig multiTenancyConfig)
        {
            _sessionAppService = sessionAppService;
            _multiTenancyConfig = multiTenancyConfig;
        }


        public async Task<IViewComponentResult> InvokeAsync()
        {
            var model = new TopazUserAreaViewModel
            {
                LoginInformations = await _sessionAppService.GetCurrentLoginInformations(),
                IsMultiTenancyEnabled = _multiTenancyConfig.IsEnabled,
            };

            
            return View(model);
        }
    }
}
