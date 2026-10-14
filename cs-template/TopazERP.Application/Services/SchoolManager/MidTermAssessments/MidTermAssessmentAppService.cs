using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.MidTermAssessments;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.MidTermAssessments.Dto;

namespace TopazERP.Services.SchoolManager.MidTermAssessments;

public class MidTermAssessmentAppService:TopazERPAppServiceBase,IMidTermAssessmentAppService
{
    private readonly IMapper _mapper;
    private readonly IMidTermAssessmentManager _midTermAssessmentManager;

    public MidTermAssessmentAppService(IMidTermAssessmentManager midTermAssessmentManager, IMapper mapper)
    {
        _midTermAssessmentManager = midTermAssessmentManager;
        _mapper = mapper;
    }
    
    //header
    public async Task<object> CreateHeader(CreateAssessmentHeaderInput input)
    {
        var entity = _mapper.Map<AssessmentRemarkHeader>(input);
        return await _midTermAssessmentManager.CreateHeader(entity);
    }

    public async Task UpdateHeader(UpdateAssessmentHeaderInput input)
    {
        var entity = _mapper.Map<AssessmentRemarkHeader>(input);
         await _midTermAssessmentManager.UpdateHeader(entity);
    }
    public async Task DeleteHeader(Guid id)
    {
        await _midTermAssessmentManager.DeleteHeader(id);
    }
    public async Task<IEnumerable<object>> ListAllAssessmentHeaders()
    {
        return await _midTermAssessmentManager.ListAllAssessmentHeaders();
    }
    
    //main assessment
    public async Task<object> CreateMidTermAssessment(CreateMTAssessmentInput input)
    {
        var entity = _mapper.Map<MidTermAssessment>(input);
        return await _midTermAssessmentManager.CreateMidTermAssessment(entity);
    }

    public async Task UpdateMidTermAssessment(UpdateMTAssessmentInput input)
    {
        var entity = _mapper.Map<MidTermAssessment>(input);
        await _midTermAssessmentManager.UpdateMidTermAssessment(entity);
    }

    public async Task DeleteMidTermAssessment(Guid id)
    { 
        await _midTermAssessmentManager.DeleteMidTermAssessment(id);
    }

    public async Task<IEnumerable<object>> ListAllMidTermAssessments()
    {
        return await _midTermAssessmentManager.ListAllMidTermAssessments();
    }
    public async Task<IEnumerable<object>> GetMidTermAssessmentByStudentId(Guid studentId)
    {
        return await _midTermAssessmentManager.GetMidTermAssessmentByStudentId(studentId);
    }
}