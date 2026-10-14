using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.SubjectRemarks;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.SubjectRemarks.Dto;

namespace TopazERP.Services.SchoolManager.SubjectRemarks;

public class SubjectRemarkAppService:TopazERPAppServiceBase, ISubjectRemarkAppService
{
    private readonly ISubjectRemarkManager _subjectRemarkManager;
    private readonly IMapper _mapper;
    
    public SubjectRemarkAppService(ISubjectRemarkManager subjectRemarkManager, IMapper mapper)
    {
        _subjectRemarkManager = subjectRemarkManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateSubjectRemarkInput input)
    {
        var entity = _mapper.Map<SubjectRemark>(input);
        return await _subjectRemarkManager.Create(entity);
    }

    public async Task Update(UpdateSubjectRemarkInput input)
    {
        var entity = _mapper.Map<SubjectRemark>(input);
        await _subjectRemarkManager.Update(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _subjectRemarkManager.ListAll();
    }

    public async Task Delete(System.Guid id)
    {
        await _subjectRemarkManager.Delete(id);
    }

}