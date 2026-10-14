using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffRelationships;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffRelationships.Dto;

namespace TopazERP.Services.SchoolManager.StaffRelationships;

public class StaffRelationshipAppService : TopazERPAppServiceBase, IStaffRelationshipAppService
{
    private readonly IStaffRelationshipManager _staffRelationshipManager;
    private readonly IMapper _mapper;
    
    public StaffRelationshipAppService(IStaffRelationshipManager staffRelationshipManager, IMapper mapper)
    {
        _staffRelationshipManager = staffRelationshipManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStaffRelationshipInput input)
    {
        var entity = _mapper.Map<StaffRelationship>(input);
        return await _staffRelationshipManager.Create(entity);
    }

    public async Task Update(UpdateStaffRelationshipInput input)
    {
        var entity = _mapper.Map<StaffRelationship>(input);
        await _staffRelationshipManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _staffRelationshipManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _staffRelationshipManager.Delete(id);
    }
}