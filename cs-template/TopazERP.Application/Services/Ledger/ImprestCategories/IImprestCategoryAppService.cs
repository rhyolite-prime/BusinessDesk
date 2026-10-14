using TopazERP.Services.Ledger.ImprestCategories.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.ImprestCategories
{
    public interface IImprestCategoryAppService: Abp.Application.Services.IApplicationService
    {
        Task<object> ListAll();
        Task<object> Create(CreateImprestCategoryInput input);
        Task Update(UpdateImprestCategoryInput input);
        Task Delete(Guid Id);
    }
}
