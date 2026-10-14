using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.ClassesAndStreams.Dto;

namespace TopazERP.Services.SchoolManager.ClassesAndStreams;

public interface IClassesAndStreamsAppService: Abp.Application.Services.IApplicationService
{
    Task<IEnumerable<object>> ListAllClasses();
    Task<object> CreateClass(CreateClassInput input); 
    Task UpdateClass(UpdateClassInput input);
    Task DeleteClass(Guid id);
    
    Task<IEnumerable<object>> ListAllStreams();
    Task<object> CreateStream(CreateStreamInput input); 
    Task UpdateStream(UpdateStreamInput input);
    Task DeleteStream(Guid id);
}