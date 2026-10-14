using System;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.SubjectRemarks;

public class SubjectRemarkManager: Abp.Domain.Services.DomainService, ISubjectRemarkManager
{
    public readonly  IRepository<SubjectRemark, Guid> SubjectRemarkRepository;
    
    public SubjectRemarkManager(IRepository<SubjectRemark, Guid> subjectRemarkRepository)
    {
        SubjectRemarkRepository = subjectRemarkRepository;
    }
    
    public async Task<object> Create(SubjectRemark entity)
    {
        var data = await SubjectRemarkRepository.FirstOrDefaultAsync(x => x.Stage == entity.Stage && x.GradeNumber == entity.GradeNumber && x.MinMark == entity.MinMark && x.MaxMark == entity.MaxMark);
        if (data == null)
        {
            await SubjectRemarkRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    
    public async Task Update(SubjectRemark entity)
    {
        await SubjectRemarkRepository.UpdateAsync(entity);
    }
    
    public async Task<System.Collections.Generic.IEnumerable<object>> ListAll()
    {
        var data = await SubjectRemarkRepository.GetAllListAsync();
        return data.OrderBy(x => x.MaxMark).ToList();
    }
    
    public async Task Delete(Guid id)
    {
        await SubjectRemarkRepository.DeleteAsync(id);
    }
    
}