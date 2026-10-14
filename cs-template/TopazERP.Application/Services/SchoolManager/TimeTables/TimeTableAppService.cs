using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.TimeTables;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.TimeTables.Dto;

namespace TopazERP.Services.SchoolManager.TimeTables;

public class TimeTableAppService:TopazERPAppServiceBase, ITimeTableAppService
{
    private readonly ITimeTableManager _timeTableManager;
    private readonly IMapper _mapper;

    public TimeTableAppService(ITimeTableManager timeTableManager, IMapper mapper)
    {
        _timeTableManager = timeTableManager;
        _mapper = mapper;
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _timeTableManager.ListAll();
    }
    
    public async Task<object> Create(CreateTimeTableInput term)
    {
        var obj = _mapper.Map<TimeTable>(term);
        return await _timeTableManager.Create(obj);
    }

    public async Task Update(UpdateTimeTableInput term)
    {
        var obj = _mapper.Map<TimeTable>(term);
        await _timeTableManager.Update(obj);
    }

    public async Task Delete(Guid id)
    {
        await _timeTableManager.Delete(id);
    }       
}