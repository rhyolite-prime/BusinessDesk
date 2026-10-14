using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.CategoryPercentages;

public interface ICategoryPercentageManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CategoryPercentage categoryPercentage);
    Task Update(CategoryPercentage categoryPercentage);
    Task Delete(System.Guid id);
    
}