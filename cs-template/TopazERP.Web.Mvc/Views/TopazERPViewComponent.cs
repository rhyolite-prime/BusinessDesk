using Abp.AspNetCore.Mvc.ViewComponents;

namespace TopazERP.Web.Views
{
    public abstract class TopazERPViewComponent : AbpViewComponent
    {
        protected TopazERPViewComponent()
        {
            LocalizationSourceName = TopazERPConsts.LocalizationSourceName;
        }
    }
}
