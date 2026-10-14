using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.RemarkByTeachers;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.RemarkByTeachers.Dto;

namespace TopazERP.Services.SchoolManager.RemarkByTeachers;

public class RemarkByTeacherAppService: TopazERPAppServiceBase, IRemarkByTeacherAppService
{
    private readonly IMapper _mapper;
    private readonly IRemarkByTeacherManager _remarkByTeacherManager;

    public RemarkByTeacherAppService(IRemarkByTeacherManager remarkByTeacherManager, IMapper mapper)
    {
        _remarkByTeacherManager = remarkByTeacherManager;
        _mapper = mapper;
    }
    
    public async Task<object> Create(ImportRemarksDto input)
    {
        var entity = _mapper.Map<RemarksByTeacher>(input);
        return await _remarkByTeacherManager.Create(entity);
    }
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _remarkByTeacherManager.ListAll();
    }
    public async Task Update(UpdateRemarksInput input)
    {
        var entity = _mapper.Map<RemarksByTeacher>(input);
        await _remarkByTeacherManager.Update(entity);
    }
}