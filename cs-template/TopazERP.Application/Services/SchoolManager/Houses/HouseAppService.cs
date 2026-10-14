using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Houses;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Houses.Dto;

namespace TopazERP.Services.SchoolManager.Houses;

public class HouseAppService: TopazERPAppServiceBase, IHouseAppService
{
    private readonly IHouseManager _houseManager;
    private readonly IMapper _mapper;

    public HouseAppService(IHouseManager houseManager, IMapper mapper)
    {
        _houseManager = houseManager;
        _mapper = mapper;
    }
    public async Task<object> Create(CreateHouseInput input)
    {
        var entity = _mapper.Map<House>(input);
        return await _houseManager.Create(entity);
    }
    public async Task Update(UpdateHouseInput input)
    {
        var entity = _mapper.Map<House>(input);
        await _houseManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _houseManager.ListAll();
    }
    public async Task Delete(Guid id)
    {
        await _houseManager.Delete(id);
    }

}