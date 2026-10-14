using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using TopazERP.DomainServices.SchoolManger.ClassAttendances.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassAttendances;

public class AttendanceManager: DomainService, IAttendanceManager
{
    private readonly IRepository<Attendance, Guid> _repositoryAttendance;
    private readonly IRepository<CumulativeAttendance, Guid> _repositoryCumulativeAttendance;

    public AttendanceManager(IRepository<Attendance, Guid> repositoryAttendance, IRepository<CumulativeAttendance, Guid> repositoryCumulativeAttendance)
    {
        _repositoryAttendance = repositoryAttendance;
        _repositoryCumulativeAttendance = repositoryCumulativeAttendance;
    }
    
    public async Task<object> Create(Attendance input)
    {
            await _repositoryAttendance.InsertAsync(input);
            
        
        return new
        {
            code = 200,
            message = $"Successfully created."
        };
    }
    
    public async Task Update(Attendance input)
    {
        
                await _repositoryAttendance.InsertAsync(input);
          
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _repositoryAttendance.GetAllListAsync();
        return data.OrderBy(x => x.StudentIdentifier).ToList();
    }
    public async Task Delete(Guid id)
    {
        await _repositoryAttendance.DeleteAsync(id);
    }
    
    //cumulation of attendance
    public async Task<object> CreateAttendance(CumulativeAttendance entity)
    {
        await _repositoryCumulativeAttendance.InsertAsync(entity);
            
        
        return new
        {
            code = 200,
            message = $"Successfully created."
        };
    }
    public async Task UpdateAttendance(CumulativeAttendance input)
    {
        await _repositoryCumulativeAttendance.UpdateAsync(input);
          
    }
    
    public async Task<IEnumerable<object>> ListAllCumulativeAttendance()
    {
        var data = await _repositoryCumulativeAttendance.GetAllListAsync();
        return data.ToList();
    }
    public async Task DeleteAttendance(Guid id)
    {
        await _repositoryCumulativeAttendance.DeleteAsync(id);
    }
    
}