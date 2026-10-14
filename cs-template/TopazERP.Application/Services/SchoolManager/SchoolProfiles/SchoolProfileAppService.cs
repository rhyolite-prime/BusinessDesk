using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.SchoolProfiles;
using TopazERP.Services.SchoolManager.SchoolProfiles.Dto;

namespace TopazERP.Services.SchoolManager.SchoolProfiles;

public class SchoolProfileAppService:TopazERPAppServiceBase, ISchoolProfileAppService
{
    private readonly ISchoolProfileManager _schoolProfileManager;
    private readonly IMapper _mapper;
    
    public SchoolProfileAppService(ISchoolProfileManager schoolProfileManager, IMapper mapper)
    {
        _schoolProfileManager = schoolProfileManager;
        _mapper = mapper;
    }
    
    public async Task<object> GetProfile()
    {
        return await _schoolProfileManager.GetProfile();
    }
    public async Task Create(CreateSchoolProfileInput input)
    {
        var obj = _mapper.Map<Models.Sch.SchoolProfile>(input);
        if (!string.IsNullOrEmpty(input.CompanyLogoBase64))
        {
            obj.CompanyLogo = Convert.FromBase64String(input.CompanyLogoBase64);
        }
        if (!string.IsNullOrEmpty(input.SignatureBase64))
        {
            obj.Signature = Convert.FromBase64String(input.SignatureBase64);
        }
        await _schoolProfileManager.Create(obj);
    }
    public async Task Update(UpdateSchoolProfileInput input)
    {
        var obj = _mapper.Map<Models.Sch.SchoolProfile>(input);
        if (!string.IsNullOrEmpty(input.CompanyLogoBase64))
        {
            obj.CompanyLogo = Convert.FromBase64String(input.CompanyLogoBase64);
        }
        if (!string.IsNullOrEmpty(input.SignatureBase64))
        {
            obj.Signature = Convert.FromBase64String(input.SignatureBase64);
        }
        await _schoolProfileManager.Update(obj);
    }
    
    public async Task<(string, string, string, string)> GetCurrentAcademicYear()
    {
        return await _schoolProfileManager.GetCurrentAcademicYear();
    }
    
    
    
    
    
}