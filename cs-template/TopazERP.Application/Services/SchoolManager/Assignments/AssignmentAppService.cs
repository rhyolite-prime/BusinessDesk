using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Assignments;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Assignments.Dto;

namespace TopazERP.Services.SchoolManager.Assignments;

public class AssignmentAppService: TopazERPAppServiceBase, IAssignmentAppService
{
    private readonly IMapper _mapper;
    private readonly IAssignmentManager _assignmentManager;

    public AssignmentAppService(IAssignmentManager assignmentManager, IMapper mapper)
    {
        _assignmentManager = assignmentManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateAssignmentInput input)
    {
        var entity = _mapper.Map<ClassAssignment>(input);
        return await _assignmentManager.Create(entity);
    }

    public async Task Update(UpdateAssignmentInput input)
    {
        var entity = _mapper.Map<ClassAssignment>(input);
        await _assignmentManager.Update(entity);
    }
    public async Task Delete(Guid id)
    {
        await _assignmentManager.Delete(id);
    }

    public async Task<IEnumerable<object>> ListAllByType(string type)
    {
        return await _assignmentManager.ListAllByType(type);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _assignmentManager.ListAll();
    }

    public async Task<int> GetNextAssignmentNumber(Guid academicYearId, Guid termId, Guid classId, Guid subjectId,
        string type)
    {
        return await _assignmentManager.GetNextAssignmentNumber(academicYearId, termId, classId, subjectId, type);
    }
    
    // result period
    public async Task<IEnumerable<object>> ListAllPeriods()
    {
        return await _assignmentManager.ListAllPeriods();
    }
    public async Task<object> CreatePeriod(CreateResultPeriodInput input)
    {
        var entity = _mapper.Map<ResultPeriod>(input);
        return await _assignmentManager.CreatePeriod(entity);
    }

    public async Task UpdatePeriod(UpdateResultPeriodInput input)
    {
        var entity = _mapper.Map<ResultPeriod>(input);
        await _assignmentManager.UpdatePeriod(entity);
    }
    public async Task DeletePeriod(Guid id)
    {
        await _assignmentManager.DeletePeriod(id);
    }
    
}