using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.PtaExecutives;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.PtaExecutives.Dto;
using TopazERP.Services.SchoolManager.PtaPositions;
using TopazERP.Services.SchoolManager.PtaPositions.Dto;

namespace TopazERP.Services.SchoolManager.PtaExecutives;

public class PtaExecutiveAppService: TopazERPAppServiceBase, IPtaExecutiveAppService
{
    private readonly IMapper _mapper;
    private readonly IPtaExecutiveManager _ptaExecutiveManager;

    public PtaExecutiveAppService(IMapper mapper, IPtaExecutiveManager ptaExecutiveManager)
    {
        _mapper = mapper;
        _ptaExecutiveManager = ptaExecutiveManager;
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _ptaExecutiveManager.ListAll();
    }
    
    public async Task<object> Create(CreatePtaExecutiveInput input)
    {
        var entity = _mapper.Map<PtaExecutive>(input);
        return await _ptaExecutiveManager.Create(entity);
    }
    public async Task Update(UpdatePtaExecutiveInput input)
    {
        var entity = _mapper.Map<PtaExecutive>(input);
        await _ptaExecutiveManager.Update(entity);
    }
    public async Task Delete(Guid id)
    {
        await _ptaExecutiveManager.Delete(id);
    }
}