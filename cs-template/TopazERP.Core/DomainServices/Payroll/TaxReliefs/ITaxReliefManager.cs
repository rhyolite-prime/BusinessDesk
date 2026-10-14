using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.TaxReliefs
{
   public interface ITaxReliefManager : Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> Create(TaxRelief input);
        Task Update(TaxRelief input);
        Task Delete(Guid Id);
    }
}
