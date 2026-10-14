using Abp.AspNetCore.Mvc.Views;
using Abp.Runtime.Session;
using Microsoft.AspNetCore.Mvc.Razor.Internal;

namespace TopazERP.Web.Views
{
    public abstract class TopazERPRazorPage<TModel> : AbpRazorPage<TModel>
    {
        [RazorInject]
        public IAbpSession AbpSession { get; set; }

        protected TopazERPRazorPage()
        {
            LocalizationSourceName = TopazERPConsts.LocalizationSourceName;
        }
    }
}
