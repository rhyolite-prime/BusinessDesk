using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassesAndStreams;

public class ClassesAndStreamsManager: Abp.Domain.Services.DomainService,IClassesAndStreamsManager
{
    private readonly IRepository<Class, Guid> _repositoryClass;
    private readonly IRepository<Stream, Guid> _repositoryStream;
    public ClassesAndStreamsManager(IRepository<Class, Guid> repositoryClass, IRepository<Stream, Guid> repositoryStream)
    {
        _repositoryClass = repositoryClass;
        _repositoryStream = repositoryStream;
    }
    public async Task<IEnumerable<object>> ListAllClasses()
    {
        var data = await _repositoryClass.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();
    }

    public async Task<object> CreateClass(Class input)
    {
        var datta = await _repositoryClass.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == input.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryClass.InsertAsync(input);

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

    public async Task UpdateClass(Class input)
    {
        await _repositoryClass.UpdateAsync(input);
    }

    public async Task DeleteClass(Guid id)
    {
        await _repositoryClass.DeleteAsync(id);
    }

    public async Task<IEnumerable<object>> ListAllStreams()
    {
        var data = await _repositoryStream.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();
    }

    public async Task<object> CreateStream(Stream input)
    {
        var datta = await _repositoryStream.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == input.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryStream.InsertAsync(input);

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

    public async Task UpdateStream(Stream input)
    {
        await _repositoryStream.UpdateAsync(input);
    }

    public async Task DeleteStream(Guid id)
    {
        await _repositoryStream.DeleteAsync(id);
    }
}