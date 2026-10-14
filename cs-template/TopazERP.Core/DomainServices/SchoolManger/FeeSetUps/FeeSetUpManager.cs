using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Abp.Domain.Repositories;
using Abp.Domain.Services;
using Microsoft.EntityFrameworkCore;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.FeeSetUps;

public class FeeSetUpManager:DomainService, IFeeSetUpManager
{
    private readonly IRepository<FeeSetUp, Guid> _feeSetUpRepository;
    private readonly IRepository<BoardingItem, Guid> _boardingItemRepository;
    private readonly IRepository<BoardingFee, Guid> _boardingFeeRepository;

    public FeeSetUpManager(IRepository<FeeSetUp, Guid> feeSetUpRepository, IRepository<BoardingItem, Guid> boardingItemRepository, IRepository<BoardingFee, Guid> boardingFeeRepository)
    {
        _feeSetUpRepository = feeSetUpRepository;
        _boardingItemRepository = boardingItemRepository;
        _boardingFeeRepository = boardingFeeRepository;
    }

    public async Task<IEnumerable<object>> ListAllFees()
    {
        var data = await _feeSetUpRepository.GetAllListAsync();
        return data;
    }
    public async Task<object> CreateFee(FeeSetUp feeSetUp)
    {
        foreach (var detail in feeSetUp.Details)
        {
            detail.FeeSetUpId = feeSetUp.Id;
        }
        await _feeSetUpRepository.InsertAsync(feeSetUp);
        
        return new { code = 200, message = "successful" };
    }
    public async Task<object> CreateMultipleFees(List<FeeSetUp> feeSetUps)
    {
        foreach (var feeSetUp in feeSetUps)
        {
            if (feeSetUp.Details != null)
            {
                foreach (var detail in feeSetUp.Details)
                {
                    detail.FeeSetUpId = feeSetUp.Id;
                }
            }
            await _feeSetUpRepository.InsertAsync(feeSetUp);
        }
        return new { code = 200, message = "successful" };
    }
    
    
    
    public async Task UpdateFee(FeeSetUp feeSetUp)
    {
        await _feeSetUpRepository.UpdateAsync(feeSetUp);
    }
    public async Task DeleteFee(Guid id)
    {
        await _feeSetUpRepository.DeleteAsync(id);
    }
    
    //boarding items
    public async Task<IEnumerable<object>> ListAllBoardingItems()
    {
        var data = await _boardingItemRepository.GetAllListAsync();
        return data.OrderBy(b => b.Name).ToList();
    }
    public async Task<object> CreateBoardingItem(BoardingItem boardingItem)
    {
        var data = await _boardingItemRepository.FirstOrDefaultAsync(x => x.Name.Trim().ToLower() == boardingItem.Name.Trim().ToLower());

        if (data == null)
        {
            await _boardingItemRepository.InsertAsync(boardingItem);

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
    public async Task UpdateBoardingItem(BoardingItem boardingItem)
    {
        await _boardingItemRepository.UpdateAsync(boardingItem);
    }
    public async Task DeleteBoardingItem(Guid id)
    {
        await _boardingItemRepository.DeleteAsync(id);
    }
    //boarding fees
    public async Task<IEnumerable<object>> ListAllBoardingFees()
    {
        var data = await _boardingFeeRepository.GetAllListAsync();
        return data;
    }
    public async Task<object> CreateBoardingFee(BoardingFee boardingFee)
    {
        foreach (var detail in boardingFee.Details)
        {
            detail.BoardingFeeId = boardingFee.Id;
        }
        
        await _boardingFeeRepository.InsertAsync(boardingFee);
        return new { code = 200, message = "successful" };
    }
    public async Task<object> CreateMultipleBoardingFees(List<BoardingFee> boardingFee)
    {
        foreach (var fee in boardingFee)
        {
            if (fee.Details != null)
            {
                foreach (var detail in fee.Details)
                {
                    detail.BoardingFeeId = fee.Id;
                }
            }
            await _boardingFeeRepository.InsertAsync(fee);
        }
        return new { code = 200, message = "successful" };
    }
    public async Task UpdateBoardingFee(BoardingFee boardingFee)
    {
        await _boardingFeeRepository.UpdateAsync(boardingFee);
    }
    public async Task DeleteBoardingFee(Guid id)
    {
        await _boardingFeeRepository.DeleteAsync(id);
    }
}