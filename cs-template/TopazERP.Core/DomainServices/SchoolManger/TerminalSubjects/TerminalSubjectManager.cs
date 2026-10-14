using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.TerminalSubjects;

public class TerminalSubjectManager : Abp.Domain.Services.DomainService, ITerminalSubjectManager
{
    private readonly IRepository<TerminalSubject, Guid> _repositoryTerminalSubject;
    private readonly IRepository<TerminalSubSubject, Guid> _repositoryTerminalSubSubject;

    public TerminalSubjectManager(IRepository<TerminalSubject, Guid> repositoryTerminalSubject, IRepository<TerminalSubSubject, Guid> repositoryTerminalSubSubject)
    {
        _repositoryTerminalSubject = repositoryTerminalSubject;
        _repositoryTerminalSubSubject = repositoryTerminalSubSubject;
    }

    public async Task<object> Create(TerminalSubject entity)
    {
        var data = await _repositoryTerminalSubject.FirstOrDefaultAsync(
            x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower()
        );

        if (data == null)
        {
            await _repositoryTerminalSubject.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }

        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task Update(TerminalSubject entity)
    {
        await _repositoryTerminalSubject.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryTerminalSubject.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task Delete(Guid id)
    {
        await _repositoryTerminalSubject.DeleteAsync(id);
    }
    
    //sub subjects
    public async Task<object> CreateSubSubject(TerminalSubSubject entity)
    {
        var data = await _repositoryTerminalSubSubject.FirstOrDefaultAsync(
            x => x.Name == entity.Name && x.TerminalSubjectId == entity.TerminalSubjectId
        );

        if (data == null)
        {
            await _repositoryTerminalSubSubject.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }

        return new { code = 400, message = "Duplicate records are not allowed." };
    }

    public async Task UpdateSubSubject(TerminalSubSubject entity)
    {
        await _repositoryTerminalSubSubject.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAllSubSubjects()
    {
        var data = await _repositoryTerminalSubSubject.GetAllListAsync();
        return data.OrderBy(d => d.Name).ToList();
    }

    public async Task DeleteSubSubject(Guid id)
    {
        await _repositoryTerminalSubSubject.DeleteAsync(id);
    }
}