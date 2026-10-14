using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Terms;

public class TermManager: Abp.Domain.Services.DomainService,ITermManager
{
    private readonly IRepository<Term, Guid> _repositoryTerm;
    public TermManager(IRepository<Term, Guid> repositoryTerm)
    {
        _repositoryTerm = repositoryTerm;
    }
    public async Task<object> Create(Term entity)
    {
        var datta = await _repositoryTerm.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryTerm.InsertAsync(entity);

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
    public async Task Update(Term entity)
    {
        await _repositoryTerm.UpdateAsync(entity);
    }

    public async Task<object> GetAsync(Guid id)
    {
        return await _repositoryTerm.GetAsync(id);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryTerm.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();

    }
    public async Task Delete(Guid id)
    {
        await _repositoryTerm.DeleteAsync(id);

    }
}