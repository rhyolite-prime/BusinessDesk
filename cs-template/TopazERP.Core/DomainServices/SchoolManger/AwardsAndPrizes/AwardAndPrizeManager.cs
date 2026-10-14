using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.AwardsAndPrizes;

public class AwardAndPrizeManager:Abp.Domain.Services.DomainService, IAwardAndPrizeManager
{
    private readonly IRepository<AwardType, Guid> _awardTypeRepository;
    private readonly IRepository<PrizeType, Guid> _prizeTypeRepository;
    private readonly IRepository<PrizeAwarded, Guid> _prizeAwardedRepository;

    public AwardAndPrizeManager(IRepository<AwardType, Guid> awardTypeRepository, IRepository<PrizeType, Guid> prizeTypeRepository, IRepository<PrizeAwarded, Guid> prizeAwardedRepository)
    {
        _awardTypeRepository = awardTypeRepository;
        _prizeTypeRepository = prizeTypeRepository;
        _prizeAwardedRepository = prizeAwardedRepository;
    }
    // Award Types
    public async Task<object> CreateAwardType(AwardType awardType)
    {
        var data = await _awardTypeRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == awardType.Name.Trim().ToLower());
        if (data == null)
        {
            await _awardTypeRepository.InsertAsync(awardType);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    public async Task UpdateAwardType(AwardType awardType)
    {
        await _awardTypeRepository.UpdateAsync(awardType);
    }
    public async Task DeleteAwardType(Guid id)
    {
        await _awardTypeRepository.DeleteAsync(id);
    }

    public async Task<IEnumerable<object>> ListAllAwards()
    {
        var data = await _awardTypeRepository.GetAllListAsync();
        return data.ToList();
    }
    
    // prize types
    public async Task<object> CreatePrizeType(PrizeType prizeType)
    {
        var data = await _prizeTypeRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == prizeType.Name.Trim().ToLower());
        if (data == null)
        {
            await _prizeTypeRepository.InsertAsync(prizeType);
            return new { code = 200, message = "successful" };
        }
        else
        {
            return new { code = 400, message = "Duplicate records are not allowed." };
        }
    }
    public async Task UpdatePrizeType(PrizeType prizeType)
    {
        await _prizeTypeRepository.UpdateAsync(prizeType);
    }

    public async Task DeletePrizeType(Guid id)
    {
        await _prizeTypeRepository.DeleteAsync(id);
    }
    public async Task<IEnumerable<object>> ListAllPrizes()
    {
        var data = await _prizeTypeRepository.GetAllListAsync();
        return data.ToList();
    }
    // prize awards
    public async Task<object> CreatePrizeAward(PrizeAwarded prizeAwarded)
    {
        await _prizeAwardedRepository.InsertAsync(prizeAwarded);
        foreach (var detail in prizeAwarded.Details)
        {
            detail.PrizeAwardId = prizeAwarded.Id;
        }
        return new { code = 200, message = "successful" };
    }
    public async Task UpdatePrizeAward(PrizeAwarded prizeAwarded)
    {
        await _prizeAwardedRepository.UpdateAsync(prizeAwarded);
    }
    public async Task DeletePrizeAward(Guid id)
    {
        await _prizeAwardedRepository.DeleteAsync(id);
    }

    public async Task<IEnumerable<object>> ListAllPrizeAwards()
    {
        var data = await _prizeAwardedRepository.GetAllListAsync();
        return data.ToList();
    }
}