using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.Models.Shared;

namespace TopazERP.DomainServices.Shared.CompanyProfiles
{
    public interface ICompanyProfileManager : Abp.Domain.Services.IDomainService
    {
        Task<CompanyProfile> GetProfile();
        Task Create(CompanyProfile input);
        Task Update(CompanyProfile input);
    }
}
