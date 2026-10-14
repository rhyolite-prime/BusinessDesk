using System;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.Extensions.Logging;
using TopazERP.Models.Ar;
using TopazERP.Services.Ar.Quotations.Dto;
using TopazERP.DomainServices.Ar.Quotations;

namespace TopazERP.Services.Ar.Quotations;

public class QuotationsAppService: TopazERPAppServiceBase, IQuotationsAppService
{
    private readonly IQuotationsManager _quotationsManager;
    private readonly IMapper _mapper;
    

    public QuotationsAppService(IQuotationsManager quotationsManager, IMapper mapper)
    {
        _quotationsManager = quotationsManager;
        _mapper = mapper;
        
    }

    public async Task<object> Create(CreateQuotationsInput input)
    {
        var obj = _mapper.Map<Quotation>(input);
        return await _quotationsManager.Create(obj);
    }

    public async Task<object> Update(UpdateQuotaionsInput input)
    {
        var obj = _mapper.Map<Quotation>(input);
        return await _quotationsManager.Update(obj);
    }

    public async Task<object> ListAll()
    {
        return await _quotationsManager.ListAll();
    }

    public async Task<object> GetAsync(string customerName)
    {
        return await _quotationsManager.GetAsync(customerName);
    }

    public async Task<object> Delete(Guid id)
    {
        return await _quotationsManager.Delete(id);
    }
    
}