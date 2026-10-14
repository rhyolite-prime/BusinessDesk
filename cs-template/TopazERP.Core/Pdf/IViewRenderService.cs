using System.Threading.Tasks;
using Abp.Domain.Services;

namespace TopazERP.Pdf;

public interface IViewRenderService: IDomainService
{
    Task<string> RenderToStringAsync(string controllerName, string viewName, object model);
}