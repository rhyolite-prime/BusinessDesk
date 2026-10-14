using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.Subjects;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.Subjects.Dto;

namespace TopazERP.Services.SchoolManager.Subjects;

public class SubjectAppService : TopazERPAppServiceBase, ISubjectAppService
{
    private readonly ISubjectManager _subjectManager;
    private readonly IMapper _mapper;

    public SubjectAppService(ISubjectManager subjectManager, IMapper mapper)
    {
        _subjectManager = subjectManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateSubjectInput input)
    {
        var entity = _mapper.Map<Subject>(input);
        return await _subjectManager.Create(entity);
    }

    public async Task Update(UpdateSubjectInput input)
    {
        var entity = _mapper.Map<Subject>(input);
        await _subjectManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _subjectManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _subjectManager.Delete(id);
    }
}