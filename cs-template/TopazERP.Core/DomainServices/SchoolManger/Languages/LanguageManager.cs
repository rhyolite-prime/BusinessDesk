using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.Languages;

public class LanguageManager: Abp.Domain.Services.DomainService, ILanguageManager
{
    private readonly IRepository<SmLanguage, Guid> _languageRepository;
    public LanguageManager(IRepository<SmLanguage, Guid> languageRepository)
    {
        _languageRepository = languageRepository;
    }
    public async Task<object> Create(SmLanguage entity)
    {
        var data = await _languageRepository.FirstOrDefaultAsync(x => x.Name == entity.Name);

        if (data == null)
        {
            await _languageRepository.InsertAsync(entity);

            return new
            {
                code = 200,
                message = "successful"
            };
        }
        else
        {
            return new
            {
                code = 400,
                message = "Duplicate records are not allowed."
            };
        }
    }
    public async Task Update(SmLanguage entity)     
    {
        await _languageRepository.UpdateAsync(entity);
    }
    

    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _languageRepository.GetAllListAsync();
        return data.OrderBy(data => data.Name).ToList();
    }
    public async Task Delete(Guid id)
    {
        await _languageRepository.DeleteAsync(id);
    }
    
    
}