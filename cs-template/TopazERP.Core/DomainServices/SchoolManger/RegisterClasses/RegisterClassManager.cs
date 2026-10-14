using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.RegisterClasses;

public class RegisterClassManager: Abp.Domain.Services.DomainService, IRegisterClassManager
{
    private readonly IRepository<RegisteredClass, Guid> _registeredClassRepository;

    public RegisterClassManager(IRepository<RegisteredClass, Guid> registeredClassRepository)
    {
        _registeredClassRepository = registeredClassRepository;
    }
    
    public async Task<object> Create(RegisteredClass entity)
    {
        var data = await _registeredClassRepository.FirstOrDefaultAsync(x => x.ClassId == entity.ClassId && x.AcademicYearId == entity.AcademicYearId);
        if (data == null)
        {
            await _registeredClassRepository.InsertAsync(entity);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed.", id = data.Id };
        }
    }
    public async Task Update(RegisteredClass entity)
    {
        await _registeredClassRepository.UpdateAsync(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _registeredClassRepository.GetAllListAsync();
        return data.OrderBy(x => x.ClassName).ToList();
    }
    
    public async Task Delete(Guid id)
    {
        await _registeredClassRepository.DeleteAsync(id);
    }
    
}