using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.CompanyProfiles.Dto;

namespace TopazERP.Services.Shared.CompanyProfiles
{
    public interface ICompanyProfileAppService : Abp.Application.Services.IApplicationService
    {
        Task<CompanyProfile> GetProfile();
        Task Create(CreateCompanyProfileInput input);
        Task Update(UpdateCompanyProfileInput input);
    }
}
