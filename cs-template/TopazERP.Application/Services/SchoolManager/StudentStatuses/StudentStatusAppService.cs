using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentStatuses;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentStatuses.Dto;

namespace TopazERP.Services.SchoolManager.StudentStatuses;

public class StudentStatusAppServiceAbp:TopazERPAppServiceBase, IStudentStatusAppService
{
    private readonly IStudentStatusManager _studentStatusManager;
    private readonly IMapper _mapper;

    public StudentStatusAppServiceAbp(IStudentStatusManager studentStatusManager, IMapper mapper)
    {
        _studentStatusManager = studentStatusManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(CreateStudentStatusInput input)
    {
        var entity = _mapper.Map<StudentStatus>(input);
        return await _studentStatusManager.Create(entity);
    }
    public async Task Update(UpdateStudentStatusInput input)
    {
        var entity = _mapper.Map<StudentStatus>(input);
        await _studentStatusManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentStatusManager.ListAll();
    }
    public async Task Delete(System.Guid id)
    {
        await _studentStatusManager.Delete(id);
    }
}