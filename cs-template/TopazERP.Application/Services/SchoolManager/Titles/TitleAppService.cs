using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Titles;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Titles.Dto;

namespace TopazERP.Services.SchoolManager.Titles;

public class TitleAppService : TopazERPAppServiceBase, ITitleAppService
{
    private readonly ITitleManager _titleManager;
    private readonly IMapper _mapper;

    public TitleAppService(ITitleManager titleManager, IMapper mapper)
    {
        _titleManager = titleManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateTitleInput input)
    {
        var entity = _mapper.Map<Title>(input);
        return await _titleManager.Create(entity);
    }

    public async Task Update(UpdateTitleInput input)
    {
        var entity = _mapper.Map<Title>(input);
        await _titleManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _titleManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _titleManager.Delete(id);
    }
}