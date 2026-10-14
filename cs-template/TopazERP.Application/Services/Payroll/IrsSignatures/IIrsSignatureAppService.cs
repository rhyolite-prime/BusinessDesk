using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Services.Payroll.IrsSignatures.Dto;

namespace TopazERP.Services.Payroll.IrsSignatures
{
    public interface IIrsSignatureAppService : Abp.Application.Services.IApplicationService
    {
        Task Create(CreateIrsSignatureInput input);
        Task<object> GetSignature();

    }
}
