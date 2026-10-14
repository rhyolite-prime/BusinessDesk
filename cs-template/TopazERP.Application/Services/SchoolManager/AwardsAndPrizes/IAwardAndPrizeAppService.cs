using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Services.SchoolManager.AwardsAndPrizes.Dto;

namespace TopazERP.Services.SchoolManager.AwardsAndPrizes;

public interface IAwardAndPrizeAppService: Abp.Application.Services.IApplicationService
{
    // Award Types
    Task<IEnumerable<object>> ListAllAwards();
    Task<object> CreateAwardType(CreateAwardTypeInput input);
    Task UpdateAwardType(UpdateAwardTypeInput input);
    Task DeleteAwardType(Guid id);
    
    // prize types
    Task<IEnumerable<object>> ListAllPrizes();
    Task<object> CreatePrizeType(CreatePrizeTypeInput input);
    Task UpdatePrizeType(UpdatePrizeTypeInput input);
    Task DeletePrizeType(Guid id);  
    
    // prize awards
    Task<IEnumerable<object>> ListAllPrizeAwards();
    Task<object> CreatePrizeAward(CreatePrizeAwardedInput input);
    Task UpdatePrizeAward(UpdatePrizeAwardedInput input);
    Task DeletePrizeAward(Guid id);
    
}