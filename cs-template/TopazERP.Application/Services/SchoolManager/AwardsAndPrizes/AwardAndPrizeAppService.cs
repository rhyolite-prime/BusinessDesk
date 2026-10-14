using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.AwardsAndPrizes;
using TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;

namespace TopazERP.Services.SchoolManager.AwardsAndPrizes;

public class AwardAndPrizeAppService:TopazERPAppServiceBase, IAwardAndPrizeAppService
{
    private readonly IMapper _mapper;
    private readonly IAwardAndPrizeManager _awardAndPrizeManager;
    
    public AwardAndPrizeAppService(IAwardAndPrizeManager awardAndPrizeManager, IMapper mapper)
    {
        _awardAndPrizeManager = awardAndPrizeManager;
        _mapper = mapper;
    }
    // Award Types
    public async Task<IEnumerable<object>> ListAllAwards()
    {
        return await _awardAndPrizeManager.ListAllAwards();
    }
    public async Task<object> CreateAwardType(CreateAwardTypeInput input)
    {
        var entity = _mapper.Map<Models.Sch.AwardType>(input);
        return await _awardAndPrizeManager.CreateAwardType(entity);
    }
    public async Task UpdateAwardType(UpdateAwardTypeInput input)
    {
        var entity = _mapper.Map<Models.Sch.AwardType>(input);
        await _awardAndPrizeManager.UpdateAwardType(entity);
    }

    public async Task DeleteAwardType(System.Guid id)
    {
        await _awardAndPrizeManager.DeleteAwardType(id);
    }
    // prize types
    public async Task<IEnumerable<object>> ListAllPrizes()
    {
        return await _awardAndPrizeManager.ListAllPrizes();
    }
    public async Task<object> CreatePrizeType(CreatePrizeTypeInput input)
    {
        var entity = _mapper.Map<Models.Sch.PrizeType>(input);
        return await _awardAndPrizeManager.CreatePrizeType(entity);
    }

    public async Task UpdatePrizeType(UpdatePrizeTypeInput input)
    {
        var entity = _mapper.Map<Models.Sch.PrizeType>(input);
        await _awardAndPrizeManager.UpdatePrizeType(entity);
    }
    public async Task DeletePrizeType(System.Guid id)
    {
        await _awardAndPrizeManager.DeletePrizeType(id);
    }  
    // prize awards
    public async Task<IEnumerable<object>> ListAllPrizeAwards()
    {
        return await _awardAndPrizeManager.ListAllPrizeAwards();
    }
    public async Task<object> CreatePrizeAward(CreatePrizeAwardedInput input)
    {
        var entity = _mapper.Map<Models.Sch.PrizeAwarded>(input);
        return await _awardAndPrizeManager.CreatePrizeAward(entity);
    }
    public async Task UpdatePrizeAward(UpdatePrizeAwardedInput input)
    {
        var entity = _mapper.Map<Models.Sch.PrizeAwarded>(input);
        await _awardAndPrizeManager.UpdatePrizeAward(entity);
    }

    public async Task DeletePrizeAward(System.Guid id)
    {
        await _awardAndPrizeManager.DeletePrizeAward(id);
    }
}