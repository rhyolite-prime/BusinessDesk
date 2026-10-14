using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.OpeningBalances;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.OpeningBalances.Dto;

namespace TopazERP.Services.SchoolManager.OpeningBalances;

public class OpeningBalanceAppService: TopazERPAppServiceBase,IOpeningBalanceAppService
{
    private readonly IMapper _mapper;
    private readonly IOpeningBalanceManager _openingBalanceManager;

    public OpeningBalanceAppService(IMapper mapper, IOpeningBalanceManager openingBalanceManager)
    {
        _mapper = mapper;
        _openingBalanceManager = openingBalanceManager;
    }

    public async Task<object> Create(CreateStudentOpeningBalanceInput input)
    {
        var entity = _mapper.Map<StudentOpeningBalance>(input);
        return await _openingBalanceManager.Create(entity);
    }

    public async Task Update(UpdateStudentOpeningBalanceInput input)
    {
        var entity = _mapper.Map<StudentOpeningBalance>(input);
        await _openingBalanceManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _openingBalanceManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _openingBalanceManager.Delete(id);
    }

    public async Task<object> Delete(List<Guid> balanceIds)
    {
        return await _openingBalanceManager.Delete(balanceIds);
    }

    public async Task<object> GetAsync(string studentName)
    {
        return await _openingBalanceManager.GetAsync(studentName);
    }

    public async Task<object> PostBalances(List<Guid> balanceIds)
    {
        return await _openingBalanceManager.PostBalances(balanceIds);
    }
}