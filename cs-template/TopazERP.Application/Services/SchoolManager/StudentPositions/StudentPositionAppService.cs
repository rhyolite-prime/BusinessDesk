using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentPositions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentPositions;
using TopazERP.Services.SchoolManager.StudentPositions.Dto;

namespace TopazERP.Services.SchoolManager.StudentPostions;

public class StudentPositionAppService: TopazERPAppServiceBase, IStudentPositionAppService
{
    private readonly IStudentPositionManager _studentPositionManager;
    private readonly IMapper _mapper;

    public StudentPositionAppService(IStudentPositionManager studentPositionManager, IMapper mapper)
    {
        _studentPositionManager = studentPositionManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreatePositionInput input)
    {
        var entity = _mapper.Map<Position>(input);
        return await _studentPositionManager.Create(entity);
    }

    public async Task Update(UpdatePositionInput input)
    {
        var entity = _mapper.Map<Position>(input);
        await _studentPositionManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentPositionManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _studentPositionManager.Delete(id);
    }
    // student specific methods
    public async Task<IEnumerable<object>> ListByStudentId(Guid studentId)
    {
        return await _studentPositionManager.ListByStudentId(studentId);
    }
    public async Task<object> CreateForStudent(CreateStudentPositionInput input)
    {
        var entity = ObjectMapper.Map<StudentPosition>(input);
        return await _studentPositionManager.CreateForStudent(entity);
    }
    public async Task UpdateForStudent(UpdateStudentPositionInput input)
    {
        var entity = ObjectMapper.Map<StudentPosition>(input);
        await _studentPositionManager.UpdateForStudent(entity);
    }

    public async Task DeleteForStudent(Guid studentPositionId)
    {
        await _studentPositionManager.DeleteForStudent(studentPositionId);
    }
    public async Task<IEnumerable<object>> GetAllStudentPositions()
    {
        return await _studentPositionManager.GetAllStudentPositions();
    }
}