using AutoMapper;
using TopazERP.DomainServices.Shared.TaxLevies;
using TopazERP.Models.Shared;
using TopazERP.Services.Shared.TaxLevies.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.TaxLevies;

public class TaxLevyAppService: TopazERPAppServiceBase, ITaxLevyAppService
{
    private readonly ITaxLevyManager _taxLevyManager;
    private readonly IMapper _mapper;
    
    public TaxLevyAppService(ITaxLevyManager taxLevyManager, IMapper mapper)
    {
        _taxLevyManager = taxLevyManager;
        _mapper = mapper;
    }
    public async Task<object> ListAll(string type)
    {
        return await _taxLevyManager.ListAll(type);
    }
    
    public async Task Create(CreateTaxLevyInput input)
    {
        var obj = _mapper.Map<TaxLevy>(input);
        await _taxLevyManager.Create(obj);
    }
    public async Task Update(UpdateTaxLevyInput input)
    {
        var obj = _mapper.Map<TaxLevy>(input);
        await _taxLevyManager.Update(obj);
    }
    public async Task Delete(Guid Id)
    {
        await _taxLevyManager.Delete(Id);
    }
    
}