using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ChangeStudentStatuses;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ChangeStudentStatuses.Dto;

namespace TopazERP.Services.SchoolManager.ChangeStudentStatuses;

public class ChangeStudentStatusAppService: TopazERPAppServiceBase, IChangeStudentStatusAppService
{
    private readonly IChangeStudentStatusManager _changeStudentStatusManager;
    private readonly IMapper _mapper;
    public ChangeStudentStatusAppService(IChangeStudentStatusManager changeStudentStatusManager, IMapper mapper)
    {
        _changeStudentStatusManager = changeStudentStatusManager;
        _mapper = mapper;
    }
    public async Task<object> Create(CreateChangeStudentStatusInput input)
    {
        var obj = _mapper.Map<StatusChange>(input);
        return await _changeStudentStatusManager.CreateStudentStatus(obj);
    }

    public async Task Update(UpdateChangeStudentStatusInput input)
    {
        var obj = _mapper.Map<StatusChange>(input);
        await _changeStudentStatusManager.UpdateStudentStatus(obj);
    }   
    
}