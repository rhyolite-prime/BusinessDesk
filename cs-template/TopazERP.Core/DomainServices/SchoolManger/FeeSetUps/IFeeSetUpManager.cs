using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.FeeSetUps;

public interface IFeeSetUpManager:IDomainService
{
    Task<IEnumerable<object>> ListAllFees();
    Task<object> CreateFee(FeeSetUp feeSetUp);
    Task<object> CreateMultipleFees(List<FeeSetUp> feeSetUps);
    Task UpdateFee(FeeSetUp feeSetUp);
    Task DeleteFee(Guid id);
    
    Task<IEnumerable<object>> ListAllBoardingItems();
    Task<object> CreateBoardingItem(BoardingItem boardingItem);
    Task UpdateBoardingItem(BoardingItem boardingItem);
    Task DeleteBoardingItem(Guid id);
    
    Task<IEnumerable<object>> ListAllBoardingFees();
    Task<object> CreateBoardingFee(BoardingFee boardingFee);
    Task<object> CreateMultipleBoardingFees(List<BoardingFee> boardingFee);
    Task UpdateBoardingFee(BoardingFee boardingFee);
    Task DeleteBoardingFee(Guid id);
}