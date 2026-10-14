using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Linq;

namespace TopazERP.Web.Helpers
{
    public static class RazorHtmlCustomHelper
    {

        public static HtmlString IsActive(this IHtmlHelper htmlHelper, ViewContext context, string[] controller, params string[] actions)
        {
            string currentController = context.RouteData.Values["controller"]?.ToString();
            string currentAction = context.RouteData.Values["action"]?.ToString();

            if (controller.Contains(currentController) && actions.Contains(currentAction))
            {
                return new HtmlString("active");
            }
            return new HtmlString("");
        }

        public static HtmlString IsActive(this IHtmlHelper htmlHelper, ViewContext context, string[] controller)
        {
            string currentController = context.RouteData.Values["controller"]?.ToString();


            if (controller.Contains(currentController))
            {
                return new HtmlString("mm-active");
            }
            return new HtmlString("");
        }

        public static HtmlString IsOpen(this IHtmlHelper htmlHelper, ViewContext context, string[] controller)
        {
            string currentController = context.RouteData.Values["controller"]?.ToString();


            if (controller.Contains(currentController))
            {
                return new HtmlString("open");
            }
            return new HtmlString("");
        }

        public static HtmlString IsMonthlyReportOpen(this IHtmlHelper htmlHelper, ViewContext context, string reportPrefix)
        {
            string currentAction = context.RouteData.Values["action"]?.ToString();

            if (currentAction.StartsWith("Mr"))
            {
                return new HtmlString("open");
            }
            return new HtmlString("");
        }

        public static HtmlString IsHistoricalReportOpen(this IHtmlHelper htmlHelper, ViewContext context, string reportPrefix)
        {
            string currentAction = context.RouteData.Values["action"]?.ToString();


            if (currentAction.StartsWith("Hr"))
            {
                return new HtmlString("open");
            }
            return new HtmlString("");
        }
    }
}
