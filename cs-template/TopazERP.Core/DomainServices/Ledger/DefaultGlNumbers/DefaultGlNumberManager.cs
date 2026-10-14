using System;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Ledger;

namespace TopazERP.DomainServices.Ledger.DefaultGlNumbers;

public class DefaultGlNumberManager: Abp.Domain.Services.DomainService, IDefaultGlNumberManager
{
    private readonly IRepository<DefaultGlNumber, Guid> _repositoryDefaultGlNumber;

    public DefaultGlNumberManager(IRepository<DefaultGlNumber, Guid> repositoryDefaultGlNumber)
    {
        _repositoryDefaultGlNumber = repositoryDefaultGlNumber;
    }


    public async Task<object> GetDefaultSetup()
    {
        return await _repositoryDefaultGlNumber.GetAll().FirstOrDefaultAsync();
    }

    public async Task Create(DefaultGlNumber input)
    {
        await _repositoryDefaultGlNumber.InsertAsync(input);
    }


    public async Task Update(DefaultGlNumber input)
    {
        await _repositoryDefaultGlNumber.UpdateAsync(input);
    }
}