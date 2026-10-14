using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.AcademicYears;

public class AcademicYearManager: Abp.Domain.Services.DomainService, IAcademicYearManager
{
    private readonly IRepository<AcademicYear, Guid> _repositoryAcademicYear;
    private readonly IRepository<AcademicYearTerm, Guid> _repositoryAcademicYearTerm;
    private readonly IRepository<AcademicYearTermDetail, Guid> _repositoryAcademicYearTermDetail;

    public AcademicYearManager(IRepository<AcademicYear, Guid> repositoryAcademicYear, IRepository<AcademicYearTerm, Guid> repositoryAcademicYearTerm, IRepository<AcademicYearTermDetail, Guid> repositoryAcademicYearTermDetail)
    {
        _repositoryAcademicYear = repositoryAcademicYear;
        _repositoryAcademicYearTerm = repositoryAcademicYearTerm;
        _repositoryAcademicYearTermDetail = repositoryAcademicYearTermDetail;
    }
    
    public async Task<object> Create(AcademicYear entity)
    {
        var datta = await _repositoryAcademicYear.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryAcademicYear.InsertAsync(entity);

            return new
            {
                code = 200,
                message = "successful"
            };
        }
        else
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }
    }
    public async Task Update(AcademicYear entity)
    {
        await _repositoryAcademicYear.UpdateAsync(entity);
    }

    public async Task<object> GetAsync(Guid id)
    {
        return await _repositoryAcademicYear.GetAsync(id);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryAcademicYear.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryAcademicYear.DeleteAsync(id);

    }
    
    // academic year term
    public async Task<object> CreateAcademicYearTerm(AcademicYearTerm entity)
    {
        var datta = await _repositoryAcademicYearTerm.FirstOrDefaultAsync(x => x.AcademicYearId == entity.AcademicYearId && x.TermId == entity.TermId);
        if (datta == null)
        {
            await _repositoryAcademicYearTerm.InsertAsync(entity);
            return new
            {
                code = 200,
                message = "successful"
            };
        }
        else
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }       
    }

    public async Task UpdateAcademicYearTerm(AcademicYearTerm entity)
    {
        await _repositoryAcademicYearTerm.UpdateAsync(entity);
    }
    
    public async Task<IEnumerable<object>> ListAllAcademicTerms()
    {
        var data = await _repositoryAcademicYearTerm.GetAllListAsync();
        return data.OrderBy(data => data.AcademicYearName).ThenBy(data => data.Ordinal).ToList();

    }

    public async Task DeleteAcademicYearTerm(Guid id)
    {
        await _repositoryAcademicYearTerm.DeleteAsync(id);
    }
    
    // academic year term details
    public async Task<object> CreateAcademicYearTermDetail(AcademicYearTermDetail entity)
    {
            await _repositoryAcademicYearTermDetail.InsertAsync(entity);
            return new
            {
                code = 200,
                message = "successful"
            };
        
    }
    public async Task UpdateAcademicYearTermDetail(AcademicYearTermDetail entity)
    {
        await _repositoryAcademicYearTermDetail.UpdateAsync(entity);
    }
    public async Task<IEnumerable<object>> ListAllAcademicTermDetails()
    {
        var data = await _repositoryAcademicYearTermDetail.GetAllListAsync();
        return data.OrderBy(data => data.AcademicYearTermName).ThenBy(data => data.StartDate).ToList();

    }
    public async Task DeleteAcademicYearTermDetail(Guid id)
    {
        await _repositoryAcademicYearTermDetail.DeleteAsync(id);
    }

}