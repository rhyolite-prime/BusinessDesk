using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.AcademicYears;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.AcademicYears.Dto;

namespace TopazERP.Services.SchoolManager.AcademicYears;

public class AcademicYearAppService: TopazERPAppServiceBase, IAcademicYearAppService
{
    private readonly IAcademicYearManager _academicYearManager;
    private readonly IMapper _mapper;

    public AcademicYearAppService(IAcademicYearManager academicYearManager, IMapper mapper)
    {
        _academicYearManager = academicYearManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateAcademicYearInput input)
    {
        var obj = _mapper.Map<AcademicYear>(input);
        return await _academicYearManager.Create(obj);
    }
    
    public async Task Delete(System.Guid id)
    {
        await _academicYearManager.Delete(id);
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _academicYearManager.ListAll();
    }
    
    public async Task Update(UpdateAcademicYearInput input)
    {
        var obj = _mapper.Map<AcademicYear>(input);
        await _academicYearManager.Update(obj);
    }
    
    // academic year term
    public async Task<object> CreateAcademicYearTerm(CreateAcademicYearTermInput input)
    {
        var obj = _mapper.Map<AcademicYearTerm>(input);
        return await _academicYearManager.CreateAcademicYearTerm(obj);
    }
    
    public async Task DeleteAcademicYearTerm(Guid id)
    {
        await _academicYearManager.DeleteAcademicYearTerm(id);
    }
    
    public async Task<IEnumerable<object>> ListAllAcademicTerms()
    {
        return await _academicYearManager.ListAllAcademicTerms();
    }
    
    public async Task UpdateAcademicYearTerm(UpdateAcademicYearTermInput input)
    {
        var obj = _mapper.Map<AcademicYearTerm>(input);
        await _academicYearManager.UpdateAcademicYearTerm(obj);
    }
    
    // academic year term details
    public async Task<object> CreateAcademicYearTermDetail(CreateAcademicYearTermDetailInput input)
    {
        var obj = _mapper.Map<AcademicYearTermDetail>(input);
        return await _academicYearManager.CreateAcademicYearTermDetail(obj);
    }
    
    public async Task DeleteAcademicYearTermDetail(System.Guid id)
    {
        await _academicYearManager.DeleteAcademicYearTermDetail(id);
    }
    
    public async Task<IEnumerable<object>> ListAllAcademicTermDetails()
    {
        return await _academicYearManager.ListAllAcademicTermDetails();
    }
    
    public async Task UpdateAcademicYearTermDetail(UpdateAcademicYearTermDetailInput input)
    {
        var obj = _mapper.Map<AcademicYearTermDetail>(input);
        await _academicYearManager.UpdateAcademicYearTermDetail(obj);
    }
}