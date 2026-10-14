using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.FeeSetUps;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.FeeSetUps.Dto;

namespace TopazERP.Services.SchoolManager.FeeSetUps;

public class FeeSetUpAppService: TopazERPAppServiceBase, IFeeSetUpAppService
{
    private readonly IMapper _mapper;
    private readonly IFeeSetUpManager _feeSetUpManager;

    public FeeSetUpAppService(IMapper mapper, IFeeSetUpManager feeSetUpManager)
    {
        _mapper = mapper;
        _feeSetUpManager = feeSetUpManager;
    }

    public async Task<IEnumerable<object>> ListAllFees()
    {
        return await _feeSetUpManager.ListAllFees();   
    }

    public async Task<object> CreateFee(CreateFeeSetUpInput input)
    {
        var entity = _mapper.Map<FeeSetUp>(input);
        return await _feeSetUpManager.CreateFee(entity);
    }
    public async Task<object> CreateMultipleFees(CreateMultipleFeeSetUpInput input)
    { 
        var entities = _mapper.Map<List<FeeSetUp>>(input.Items);
        return await _feeSetUpManager.CreateMultipleFees(entities);
    }
    public async Task<object> CreateMultipleBoardingFees(CreateMultipleBoardingFeesInput input)
    { 
        var entities = _mapper.Map<List<BoardingFee>>(input.Items);
        return await _feeSetUpManager.CreateMultipleBoardingFees(entities);
    }
    public async Task UpdateFee(UpdateFeeSetUpInput input)
    {
        var entity = _mapper.Map<FeeSetUp>(input);
        await _feeSetUpManager.UpdateFee(entity);
    }
    public async Task DeleteFee(Guid id)
    {
        await _feeSetUpManager.DeleteFee(id);
    }
    
    //boarding fees
    public async Task<IEnumerable<object>> ListAllBoardingFees()
    {
        return await _feeSetUpManager.ListAllBoardingFees();
    }
    
    public async Task<object> CreateBoardingFee(CreateBoardingFeeInput input)
    {
        var entity = _mapper.Map<BoardingFee>(input);
        return await _feeSetUpManager.CreateBoardingFee(entity);
    }
    public async Task UpdateBoardingFee(UpdateBoardingFeeInput input)
    {
        var entity = _mapper.Map<BoardingFee>(input);
        await _feeSetUpManager.UpdateBoardingFee(entity);
    }
    public async Task DeleteBoardingFee(Guid id)
    {
        await _feeSetUpManager.DeleteBoardingFee(id);
    }
    
    //boarding item
    public async Task<IEnumerable<object>> ListAllBoardingItems()
    {
        return await _feeSetUpManager.ListAllBoardingItems();
    }
    

    public async Task<object> CreateBoardingItem(CreateBoardingItemInput input)
    {
        var entity = _mapper.Map<BoardingItem>(input);
        return await _feeSetUpManager.CreateBoardingItem(entity);
    }
    public async Task UpdateBoardingItem(UpdateBoardingItemInput input)
    {
        var entity = _mapper.Map<BoardingItem>(input);
        await _feeSetUpManager.UpdateBoardingItem(entity);
    }
    public async Task DeleteBoardingItem(Guid id)
    {
        await _feeSetUpManager.DeleteBoardingItem(id);
    }
    
}