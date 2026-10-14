using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.BehavioralAssessments;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.BehavioralAssessments.Dto;

namespace TopazERP.Services.SchoolManager.BehavioralAssessments;

public class BehavioralAssessmentAppService:TopazERPAppServiceBase, IBehavioralAssessmentAppService
{
    private readonly IMapper _mapper;
    private readonly IBehavioralAssessmentManager _behavioralAssessmentManager;
    public BehavioralAssessmentAppService(IMapper mapper, IBehavioralAssessmentManager behavioralAssessmentManager)
    {
        _mapper = mapper;
        _behavioralAssessmentManager = behavioralAssessmentManager;
    }
    
    public async Task<object> Create(CreateBehavioralAssessmentInput input)
    {
        var entity = _mapper.Map<BehavioralAssessment>(input);
        return await _behavioralAssessmentManager.Create(entity);
    }
    
    public async Task Update(UpdateBehavioralAssessmentInput input)
    {
        var entity = _mapper.Map<BehavioralAssessment>(input);
        await _behavioralAssessmentManager.Update(entity);
    }
    public async Task Delete(Guid id)
    {
        await _behavioralAssessmentManager.Delete(id);
    }

    public async Task<IEnumerable<object>> ListAllByType(string type)
    {
        return await _behavioralAssessmentManager.ListAllByType(type);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _behavioralAssessmentManager.ListAll();
    }
    
}