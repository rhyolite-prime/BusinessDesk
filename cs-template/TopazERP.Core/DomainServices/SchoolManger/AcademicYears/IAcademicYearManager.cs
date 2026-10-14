using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.AcademicYears;

public interface IAcademicYearManager: Abp.Domain.Services.IDomainService
{
    // Academic year
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(AcademicYear year); 
    Task Update(AcademicYear year);
    Task Delete(Guid id);
    
    // academic year term
    Task<IEnumerable<object>> ListAllAcademicTerms();
    Task<object> CreateAcademicYearTerm(AcademicYearTerm term);
    Task UpdateAcademicYearTerm(AcademicYearTerm term);
    Task DeleteAcademicYearTerm(Guid id);
    
    // academic year term details
    Task<IEnumerable<object>> ListAllAcademicTermDetails();
    Task<object> CreateAcademicYearTermDetail(AcademicYearTermDetail termDetail);
    Task UpdateAcademicYearTermDetail(AcademicYearTermDetail termDetail);
    Task DeleteAcademicYearTermDetail(Guid id);
    
}