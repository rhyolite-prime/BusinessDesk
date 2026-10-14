using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ClassesAndStreams;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ClassesAndStreams.Dto;

namespace TopazERP.Services.SchoolManager.ClassesAndStreams;

public class ClassesAndStreamsAppService: TopazERPAppServiceBase, IClassesAndStreamsAppService
{
    private readonly IClassesAndStreamsManager _classesAndStreamsManager;
    private readonly IMapper _mapper;

    public ClassesAndStreamsAppService(IClassesAndStreamsManager classesAndStreamsManager, IMapper mapper)
    {
        _classesAndStreamsManager = classesAndStreamsManager;
        _mapper = mapper;
    }
    public async Task<IEnumerable<object>> ListAllClasses()
    {
        return await _classesAndStreamsManager.ListAllClasses();
    }
    public async Task<object> CreateClass(CreateClassInput input)
    {
        var obj = _mapper.Map<Class>(input);
        return await _classesAndStreamsManager.CreateClass(obj);
    }

    public async Task UpdateClass(UpdateClassInput input)
    {
        var obj = _mapper.Map<Class>(input);
        await _classesAndStreamsManager.UpdateClass(obj);
    }
    public async Task DeleteClass(System.Guid id)
    {
        await _classesAndStreamsManager.DeleteClass(id);
    }
    
    public async Task<IEnumerable<object>> ListAllStreams()
    {
        return await _classesAndStreamsManager.ListAllStreams();
    }

    public async Task<object> CreateStream(CreateStreamInput input)
    {
        var obj = _mapper.Map<Stream>(input);
        return await _classesAndStreamsManager.CreateStream(obj);
    }
    public async Task UpdateStream(UpdateStreamInput input)
    {
        var obj = _mapper.Map<Stream>(input);
        await _classesAndStreamsManager.UpdateStream(obj);
    }
    public async Task DeleteStream(System.Guid id)
    {
    await _classesAndStreamsManager.DeleteStream(id);
    }

}