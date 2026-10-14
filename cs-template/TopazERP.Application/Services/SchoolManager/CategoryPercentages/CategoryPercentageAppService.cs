using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.CategoryPercentages;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.CategoryPercentages.Dto;

namespace TopazERP.Services.SchoolManager.CategoryPercentages;

public class CategoryPercentageAppService: TopazERPAppServiceBase,ICategoryPercentageAppService
{
    private readonly ICategoryPercentageManager _categoryPercentageManager;
    private readonly IMapper _mapper;

    public CategoryPercentageAppService(ICategoryPercentageManager categoryPercentageManager, IMapper mapper)
    {
        _categoryPercentageManager = categoryPercentageManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateCategoryPercentageInput input)
    {
        var entity = _mapper.Map<CategoryPercentage>(input);
        return await _categoryPercentageManager.Create(entity);
    }

    public async Task Update(UpdateCategoryPercentageInput input)
    {
        var entity = _mapper.Map<CategoryPercentage>(input);
        await _categoryPercentageManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _categoryPercentageManager.ListAll();
    }

    public async Task Delete(Guid id)
    {
        await _categoryPercentageManager.Delete(id);
    }
    
}