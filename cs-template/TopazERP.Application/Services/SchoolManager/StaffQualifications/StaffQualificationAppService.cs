using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StaffQualifications;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StaffQualifications.Dto;

namespace TopazERP.Services.SchoolManager.StaffQualifications;

public class StaffQualificationAppService : TopazERPAppServiceBase, IStaffQualificationAppService
{
    private readonly IStaffQualificationManager _staffQualificationManager;
    private readonly IMapper _mapper;


    public StaffQualificationAppService(IStaffQualificationManager staffQualificationManager, IMapper mapper)
    {
        _staffQualificationManager = staffQualificationManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStaffQualificationInput input)
    {
        var entity = _mapper.Map<StaffQualification>(input);
        return await _staffQualificationManager.Create(entity);
    }

    public async Task Update(UpdateStaffQualificationInput input)
    {
        var entity = _mapper.Map<StaffQualification>(input);
        await _staffQualificationManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _staffQualificationManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _staffQualificationManager.Delete(id);
    }
}