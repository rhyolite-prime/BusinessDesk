using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Shared.Departments
{
    public interface IDepartmentManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(Department input);
        Task<Department> GetAsync(string name);
        Task Update(Department input);
        Task Delete(Guid Id);
    }
}
