using Abp.Domain.Repositories;
using TopazERP.Models.Shared;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Abp.UI;

namespace TopazERP.DomainServices.Shared.TaxLevies;

public class TaxLevyManager: Abp.Domain.Services.DomainService, ITaxLevyManager
{
    private readonly IRepository<TaxLevy, Guid> _repositoryTaxLevy;
    private readonly IRepository<CompanyProfile, Guid> _repositoryCompanyProfile;

    public TaxLevyManager(IRepository<TaxLevy, Guid> repositoryTaxLevy, IRepository<CompanyProfile, Guid> repositoryCompanyProfile)
    {
        _repositoryTaxLevy = repositoryTaxLevy;
        _repositoryCompanyProfile = repositoryCompanyProfile;
    }
   
    public async Task Create(TaxLevy entity)
    {
        var datta = await _repositoryTaxLevy.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == entity.Name.Trim().ToLower());

        if (datta == null)
        {
            await _repositoryTaxLevy.InsertAsync(entity);
             
        }
        else
        {
            throw new UserFriendlyException(400, "Duplicate records are not allowed.");
        }
        
        
        
    }
    public async Task Update(TaxLevy entity)
    {
        await _repositoryTaxLevy.UpdateAsync(entity);
    }
    public async Task<TaxLevy> GetAsync(string name)
    {
        return await _repositoryTaxLevy.FirstOrDefaultAsync(x => x.Name == name);
    }
    
    public async Task<object> ListAll(string type)
    {
        var data = await _repositoryTaxLevy.GetAllListAsync();

        switch (type)
        {
            case "vat":
                data = await _repositoryTaxLevy.GetAllListAsync(x=> x.Type == TopazERPConsts.VatTaxLevyType);
                break;
            case "others":
                data = await _repositoryTaxLevy.GetAllListAsync(x=> x.Type == TopazERPConsts.OtherTaxLevyType);
                break;
        }
    
        return data.OrderBy(d => d.Name).Select(d => new
        {
            d.Id,
            d.Name,
            d.Rate,
            d.Type,
            d.TenantId
        }).ToList();
    }

     

    public async Task Delete(Guid id)
    {
        await _repositoryTaxLevy.DeleteAsync(id);
    }
}