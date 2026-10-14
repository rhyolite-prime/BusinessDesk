using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.AcademicYears.Dto;

namespace TopazERP.Services.SchoolManager.AcademicYears;

public interface IAcademicYearAppService: Abp.Application.Services.IApplicationService
{
    // Academic year
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(CreateAcademicYearInput input); 
    Task Update(UpdateAcademicYearInput input);
    Task Delete(Guid id);
    
    // academic year term
    Task<IEnumerable<object>> ListAllAcademicTerms();
    Task<object> CreateAcademicYearTerm(CreateAcademicYearTermInput input);
    Task UpdateAcademicYearTerm(UpdateAcademicYearTermInput input);
    Task DeleteAcademicYearTerm(Guid id);
    
    // academic year term details
    Task<IEnumerable<object>> ListAllAcademicTermDetails();
    Task<object> CreateAcademicYearTermDetail(CreateAcademicYearTermDetailInput input);
    Task UpdateAcademicYearTermDetail(UpdateAcademicYearTermDetailInput input);
    Task DeleteAcademicYearTermDetail(Guid id);
    
}