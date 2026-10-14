using System;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.Imprests;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.Imprests.Dto;

namespace TopazERP.Services.Ledger.Imprests;

public class ImprestAppService: TopazERPAppServiceBase
{
    private readonly IImprestManager _imprestManager;
    private readonly IMapper _mapper;

    public ImprestAppService(IImprestManager imprestManager, IMapper mapper)
    {
        _imprestManager = imprestManager;
        _mapper = mapper;
    }


    public async Task Create(ImprestDto dto)
    {
        var obj = _mapper.Map<Imprest>(dto);
        await _imprestManager.Create(obj);
    }

    public async Task Update(ImprestDto dto)
    {
        var obj = _mapper.Map<Imprest>(dto);
        await _imprestManager.Update(obj);
    }

    public async Task<object> ListAll()
    {
        return await _imprestManager.ListAll();
    }
    
    public async Task<object> GetEmployeeImprests(Guid employeeId)
    {
        return await _imprestManager.GetEmployeeImprests(employeeId);
    }

    public async Task Delete(Guid id)
    {
        await _imprestManager.Delete(id);
    }
}