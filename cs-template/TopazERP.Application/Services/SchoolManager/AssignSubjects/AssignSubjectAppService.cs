using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.AssignSubjects;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.AssignSubjects.Dto;

namespace TopazERP.Services.SchoolManager.AssignSubjects;

public class AssignSubjectAppService: TopazERPAppServiceBase, IAssignSubjectAppService
{
    private readonly IAssignSubjectManager _assignSubjectManager;
    private readonly IMapper _mapper;

    public AssignSubjectAppService(IAssignSubjectManager assignSubjectManager, IMapper mapper)
    {
        _assignSubjectManager = assignSubjectManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateAssignSubjectInput input)
    {
        var entity = _mapper.Map<AssignedSubject>(input);
        return await _assignSubjectManager.Create(entity);
    }

    public async Task Update(UpdateAssignSubjectInput input)
    {
        var entity = _mapper.Map<AssignedSubject>(input);
        await _assignSubjectManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _assignSubjectManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _assignSubjectManager.Delete(id);
    }                   
}