using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.Ledger.DefaultGlNumbers;
using TopazERP.Models.Ledger;
using TopazERP.Services.Ledger.DefaultGlNumbers.Dto;

namespace TopazERP.Services.Ledger.DefaultGlNumbers;

public class DefaultGlNumberAppService:  TopazERPAppServiceBase, IDefaultGlNumberAppService
{
    private readonly IDefaultGlNumberManager _defaultGlNumberManager;
    private readonly IMapper _mapper;

    public DefaultGlNumberAppService(IDefaultGlNumberManager defaultGlNumberManager, IMapper mapper)
    {
        _defaultGlNumberManager = defaultGlNumberManager;
        _mapper = mapper;
    }

    public async Task<object> GetDefaultSetup()
    {
        return await _defaultGlNumberManager.GetDefaultSetup();
    }


    public async Task Create(CreateDefaultGlNumberInput input)
    {
        var obj = _mapper.Map<DefaultGlNumber>(input);
        await _defaultGlNumberManager.Create(obj);
    }

    public async Task Update(UpdateDefaultGlNumberInput input)
    {
        var obj = _mapper.Map<DefaultGlNumber>(input);
        await _defaultGlNumberManager.Update(obj);
    }
}