using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ClassAttendances;
using TopazERP.DomainServices.SchoolManger.ClassAttendances.Dto;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ClassAttendances.Dto;

namespace TopazERP.Services.SchoolManager.ClassAttendances;

public class AttendanceAppService: TopazERPAppServiceBase,IAttendanceAppService
{
    private readonly IAttendanceManager _attendanceManager;
    private readonly IMapper _mapper;

    public AttendanceAppService(IAttendanceManager attendanceManager, IMapper mapper)
    {
        _attendanceManager = attendanceManager;
        _mapper = mapper;
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _attendanceManager.ListAll();
    }

    public async Task<object> Create(CreateAttendanceInput input)
    {
        var entity = _mapper.Map<Attendance>(input);
        return await _attendanceManager.Create(entity);
        
    }

    public async Task Update(UpdateAttendanceInput input)
    {
        var entity = _mapper.Map<Attendance>(input);
        await _attendanceManager.Update(entity);
    }

    public async Task Delete(Guid id)
    {
        await _attendanceManager.Delete(id);
    }
    
    // cumulative
    public async Task<IEnumerable<object>> ListAllCumulativeAttendance()
    {
        return await _attendanceManager.ListAllCumulativeAttendance();
    }

    public async Task<object> CreateAttendance(CreateCumulativeAttendanceInput input)
    {
        var entity = _mapper.Map<CumulativeAttendance>(input);
        return await _attendanceManager.CreateAttendance(entity);
        
    }

    public async Task UpdateAttendance(UpdateCumulativeAttendanceInput input)
    {
        var entity = _mapper.Map<CumulativeAttendance>(input);
        await _attendanceManager.UpdateAttendance(entity);
    }

    public async Task DeleteAttendance(Guid id)
    {
        await _attendanceManager.DeleteAttendance(id);
    }
}