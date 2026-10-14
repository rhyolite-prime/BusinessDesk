using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.Gratuities
{
   public interface IGratuityManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task Create(Gratuity input);
        Task Update(Gratuity input);
        Task Delete(Guid Id);
    }
}
