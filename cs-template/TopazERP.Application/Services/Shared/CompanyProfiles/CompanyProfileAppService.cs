using AutoMapper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TopazERP.DomainServices.Shared.CompanyProfiles;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.CompanyProfiles.Dto;

namespace TopazERP.Services.Shared.CompanyProfiles
{
    public class CompanyProfileAppService: TopazERPAppServiceBase, ICompanyProfileAppService
    {

        private readonly ICompanyProfileManager _businessProfileManager;
        private readonly IMapper _mapper;

        public CompanyProfileAppService(ICompanyProfileManager businessProfileManager, IMapper mapper)
        {
            _businessProfileManager = businessProfileManager;
            _mapper = mapper;
        }

        public async Task<CompanyProfile> GetProfile()
        {
            return await _businessProfileManager.GetProfile();
        }


        public async Task Create(CreateCompanyProfileInput input)
        {
            var obj = _mapper.Map<CompanyProfile>(input);
            if (!string.IsNullOrEmpty(input.CompanyLogoBase64))
            {
                obj.CompanyLogo = Convert.FromBase64String(input.CompanyLogoBase64);
            }
            await _businessProfileManager.Create(obj);
        }


        public async Task Update(UpdateCompanyProfileInput input)
        {
            var obj = _mapper.Map<CompanyProfile>(input);
            if (!string.IsNullOrEmpty(input.CompanyLogoBase64))
            {
                obj.CompanyLogo = Convert.FromBase64String(input.CompanyLogoBase64);
            }
            await _businessProfileManager.Update(obj);
        }
    }
}
