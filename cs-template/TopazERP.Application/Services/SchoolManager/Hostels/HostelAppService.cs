using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Hostels;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Hostels.Dto;

namespace TopazERP.Services.SchoolManager.Hostels;

public class HostelAppService: TopazERPAppServiceBase, IHostelAppService
{
    private readonly IHostelManager _hostelManager;
    private readonly IMapper _mapper;


    public HostelAppService(IHostelManager hostelManager, IMapper mapper)
    {
        _hostelManager = hostelManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateHostelInput input)
    {
        var entity = _mapper.Map<Hostel>(input);
        return await _hostelManager.Create(entity);
    }

    public async Task Update(UpdateHostelInput input)
    {
        var entity = _mapper.Map<Hostel>(input);
        await _hostelManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _hostelManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _hostelManager.Delete(id);
    }
    
}