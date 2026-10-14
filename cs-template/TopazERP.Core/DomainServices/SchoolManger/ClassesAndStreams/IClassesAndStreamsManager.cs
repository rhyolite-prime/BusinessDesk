using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassesAndStreams;

public interface IClassesAndStreamsManager: Abp.Domain.Services.IDomainService
{
    Task<IEnumerable<object>> ListAllClasses();
    Task<object> CreateClass(Class input); 
    Task UpdateClass(Class input);
    Task DeleteClass(Guid id);
    
    Task<IEnumerable<object>> ListAllStreams();
    Task<object> CreateStream(Stream input); 
    Task UpdateStream(Stream input);
    Task DeleteStream(Guid id);
    
}