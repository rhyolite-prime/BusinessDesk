using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Subjects;

public class SubjectManager : Abp.Domain.Services.DomainService, ISubjectManager
{
    private readonly IRepository<Subject, Guid> _repositorySubject;

    public SubjectManager(IRepository<Subject, Guid> repositorySubject)
    {
        _repositorySubject = repositorySubject;
    }

    public async Task<object> Create(Subject entity)
    {
        if (entity.IsCore && entity.IsBestSubject)
        {
            return new
            {
                code = 400,
                message = "A subject cannot be both Core and NBES."
            };
        }

        var data = await _repositorySubject.FirstOrDefaultAsync(
            x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower() || x.Abbreviation.Trim().ToLower() == entity.Abbreviation.Trim().ToLower()
        );

        if (data == null)
        {
            await _repositorySubject.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }

        return new { code = 400, message = "Duplicate records are not allowed." };
    }


    public async Task Update(Subject entity)
    {
        await _repositorySubject.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositorySubject.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositorySubject.DeleteAsync(id);
    }
}