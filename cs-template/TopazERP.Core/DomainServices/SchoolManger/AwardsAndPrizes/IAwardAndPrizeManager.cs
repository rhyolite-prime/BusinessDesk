using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.AwardsAndPrizes;

public interface IAwardAndPrizeManager: Abp.Domain.Services.IDomainService
{
    // Award Types
    Task<IEnumerable<object>> ListAllAwards();
    Task<object> CreateAwardType(AwardType awardType);
    Task UpdateAwardType(AwardType awardType);
    Task DeleteAwardType(Guid id);
    
    // prize types
    Task<IEnumerable<object>> ListAllPrizes();
    Task<object> CreatePrizeType(PrizeType prizeType);
    Task UpdatePrizeType(PrizeType prizeType);
    Task DeletePrizeType(Guid id);  
    
    // prize awards
    Task<IEnumerable<object>> ListAllPrizeAwards();
    Task<object> CreatePrizeAward(PrizeAwarded prizeAwarded);
    Task UpdatePrizeAward(PrizeAwarded prizeAwarded);
    Task DeletePrizeAward(Guid id);
}