using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Microsoft.EntityFrameworkCore;
using TopazERP.DomainServices.SchoolManger.ClassPromotions.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassPromotions;

public class ClassPromotionManager:DomainService,IClassPromotionManager
{
    private readonly IRepository<ClassPromotion, Guid> _promotionRepository;

    public ClassPromotionManager(IRepository<ClassPromotion, Guid> promotionRepository)
    {
        _promotionRepository = promotionRepository;
    }
    
    public async Task<object> Create(ClassPromotion input)
    {
        await _promotionRepository.InsertAsync(input);
        return new { code = 200, message = "successful" };
    }
    public async Task Update(ClassPromotion input)
    {
        await _promotionRepository.UpdateAsync(input);
    }
    
    
    public async Task<IEnumerable<object>> ListAll()
    {
        var data = await _promotionRepository.GetAllListAsync();
        return data.OrderBy(x => x.FromClassName).ToList();
    }
    


}