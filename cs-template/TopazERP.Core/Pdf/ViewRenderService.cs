using System;
using System.IO;
using System.Threading.Tasks;
using Abp.Domain.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace TopazERP.Pdf;

public class ViewRenderService: DomainService, IViewRenderService
{
    private readonly IRazorViewEngine _razorViewEngine;
    private readonly ITempDataProvider _tempDataProvider;
    private readonly IActionContextAccessor _actionContext;
    private readonly IServiceProvider _serviceProvider;

    
    public ViewRenderService(IRazorViewEngine razorViewEngine,
        ITempDataProvider tempDataProvider,
        IActionContextAccessor actionContext, IServiceProvider serviceProvider)
    {
        _razorViewEngine = razorViewEngine;
        _tempDataProvider = tempDataProvider;
        
        _actionContext = actionContext;
        _serviceProvider = serviceProvider;
    }
    
    public async Task<string> RenderToStringAsync(string controllerName, string viewName, object model)
    {
        var httpContextAccessor = _serviceProvider.GetRequiredService<IHttpContextAccessor>();
        var httpContext = httpContextAccessor.HttpContext;

        if (httpContext == null)
        {
            httpContext = new DefaultHttpContext
            {
                RequestServices = _serviceProvider
            };
        }

        var actionContext = new ActionContext(
            httpContext,
            httpContext.GetRouteData(),
            new ActionDescriptor()
        );

        await using var sw = new StringWriter();

        // Construct the view path relative to the Views folder
        var viewPath = $"~/Views/{controllerName}/{viewName}.cshtml";

        Logger.Info($"Trying to locate view at: {viewPath}");

        // Use FindView with a relative path
        var viewResult = _razorViewEngine.GetView(null, viewPath, false);

        if (!viewResult.Success)
        {
            throw new ArgumentNullException($"The view '{viewName}' for controller '{controllerName}' cannot be found. Searched locations: {string.Join(", ", viewResult.SearchedLocations)}");
        }

        var viewDictionary = new ViewDataDictionary(new EmptyModelMetadataProvider(), new ModelStateDictionary())
        {
            Model = model
        };

        var viewContext = new ViewContext(
            actionContext,
            viewResult.View,
            viewDictionary,
            new TempDataDictionary(httpContext, _tempDataProvider),
            sw,
            new HtmlHelperOptions()
        );

        await viewResult.View.RenderAsync(viewContext);
        return sw.ToString();
    }
    
    
}