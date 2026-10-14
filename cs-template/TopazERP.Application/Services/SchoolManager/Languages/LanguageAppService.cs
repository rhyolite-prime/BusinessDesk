using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Languages;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Languages.Dto;

namespace TopazERP.Services.SchoolManager.Languages;

public class LanguageAppService : TopazERPAppServiceBase, ILanguageAppService
{
    private readonly ILanguageManager _languageManager;
    private readonly IMapper _mapper;


    public LanguageAppService(ILanguageManager languageManager, IMapper mapper)
    {
        _languageManager = languageManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateLanguageInput input)
    {
        var entity = _mapper.Map<SmLanguage>(input);
        return await _languageManager.Create(entity);
    }

    public async Task Update(UpdateLanguageInput input)
    {
        var entity = _mapper.Map<SmLanguage>(input);
        await _languageManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _languageManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _languageManager.Delete(id);
    }
}