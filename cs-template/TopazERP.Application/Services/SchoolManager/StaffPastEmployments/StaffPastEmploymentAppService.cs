using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffPastEmployments;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffPastEmployments.Dto;

namespace TopazERP.Services.SchoolManager.StaffPastEmployments;

public class StaffPastEmploymentAppService : TopazERPAppServiceBase, IStaffPastEmploymentAppService
{
    private readonly IStaffPastEmploymentManager _staffPastEmploymentManager;
    private readonly IMapper _mapper;


    public StaffPastEmploymentAppService(IStaffPastEmploymentManager staffPastEmploymentManager, IMapper mapper)
    {
        _staffPastEmploymentManager = staffPastEmploymentManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStaffPastEmploymentInput input)
    {
        var entity = _mapper.Map<StaffPastEmployment>(input);
        return await _staffPastEmploymentManager.Create(entity);
    }

    public async Task Update(UpdateStaffPastEmploymentInput input)
    {
        var entity = _mapper.Map<StaffPastEmployment>(input);
        await _staffPastEmploymentManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _staffPastEmploymentManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _staffPastEmploymentManager.Delete(id);
    }
}