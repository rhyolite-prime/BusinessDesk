using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Ar;

namespace TopazERP.DomainServices.Ar.Quotations
{
   public interface IQuotationsManager: Abp.Domain.Services.IDomainService
    {
        Task<object> ListAll();
        Task<object> GetAsync(string customerName);
        Task<object> Create(Quotation input);
        Task<object> Update(Quotation input);
        Task<object> Delete(Guid id);
    }
}
