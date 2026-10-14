using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.ClassPromotions;
using TopazERP.DomainServices.SchoolManger.ClassPromotions.Dto;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.ClassLevelPercentages;
using TopazERP.Services.SchoolManager.ClassPromotions.Dto;

namespace TopazERP.Services.SchoolManager.ClassPromotions;

public class ClassPromotionAppService:TopazERPAppServiceBase,IClassPromotionAppService
{
    private readonly IClassPromotionManager _classPromotionManager;
    private readonly IMapper _mapper;

    public ClassPromotionAppService(IMapper mapper, IClassPromotionManager classPromotionManager)
    {
        _mapper = mapper;
        _classPromotionManager = classPromotionManager;
    }
    
    public async Task<IEnumerable<object>> ListAll()
    {
        return await _classPromotionManager.ListAll();
    }

    public async Task<object> Create(CreateClassPromotionInput input)
    {
        var entity = _mapper.Map<ClassPromotion>(input);
        return await _classPromotionManager.Create(entity);
    }
    
    public async Task Update(UpdateClassPromotionInput input)
    {
        var entity = _mapper.Map<ClassPromotion>(input);
        await _classPromotionManager.Update(entity);
    }
}