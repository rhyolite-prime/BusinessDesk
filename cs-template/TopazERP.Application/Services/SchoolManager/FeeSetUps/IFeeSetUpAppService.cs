using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Application.Services;
using TopazERP.Services.SchoolManager.FeeSetUps.Dto;

namespace TopazERP.Services.SchoolManager.FeeSetUps;

public interface IFeeSetUpAppService:IApplicationService
{
    Task<IEnumerable<object>> ListAllFees();
    Task<object> CreateFee(CreateFeeSetUpInput input);
    Task<object> CreateMultipleFees(CreateMultipleFeeSetUpInput input);
    Task UpdateFee(UpdateFeeSetUpInput input);
    Task DeleteFee(Guid id);
    
    Task<IEnumerable<object>> ListAllBoardingItems();
    Task<object> CreateBoardingItem(CreateBoardingItemInput input);
    
    Task UpdateBoardingItem(UpdateBoardingItemInput input);
    Task DeleteBoardingItem(Guid id);
    
    Task<IEnumerable<object>> ListAllBoardingFees();
    Task<object> CreateBoardingFee(CreateBoardingFeeInput input);
    Task<object> CreateMultipleBoardingFees(CreateMultipleBoardingFeesInput input);
    Task UpdateBoardingFee(UpdateBoardingFeeInput input);
    Task DeleteBoardingFee(Guid id);
}