using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using TopazERP.DomainServices.SchoolManger.StudentPromotions;
using TopazERP.Models.Sch;
using TopazERP.Services.SchoolManager.StudentPromotions.Dto;

namespace TopazERP.Services.SchoolManager.StudentPromotions;

public class StudentPromotionAppService: TopazERPAppServiceBase, IStudentPromotionAppService
{
    private readonly IMapper _mapper;
    private readonly IStudentPromotionManager _studentPromotionManager;

    /// <summary>
    /// 
    /// </summary>
    /// <param name="studentPromotionManager"></param>
    /// <param name="mapper"></param>
    public StudentPromotionAppService(IStudentPromotionManager studentPromotionManager, IMapper mapper)
    {
        _studentPromotionManager = studentPromotionManager;
        _mapper = mapper;
    }

    public async Task<object> Create(CreateStudentPromotionInput input)
    {
        var entity = _mapper.Map<StudentPromotion>(input);
        return await _studentPromotionManager.Create(entity);
    }
    public async Task Update(UpdateStudentPromotionInput input)
    {
        var entity = _mapper.Map<StudentPromotion>(input);
        await _studentPromotionManager.Update(entity);
    }

    public async Task<IEnumerable<object>> ListAll()
    {
        return await _studentPromotionManager.ListAll();
    }
    
    //pre class
    public async Task<object> CreatePreClass(CreatePreClassPromotionInput input)
    {
        var entity = _mapper.Map<PreClassStudentPromotion>(input);
        return await _studentPromotionManager.CreatePreClass(entity);
    }
    

    public async Task UpdatePreClass(UpdatePreClassPromotionInput input)
    {
        var entity = _mapper.Map<PreClassStudentPromotion>(input);
        await _studentPromotionManager.UpdatePreClass(entity);
    }

    public async Task<IEnumerable<object>> ListAllPreClass()
    {
        return await _studentPromotionManager.ListAllPreClass();
    }
    
    
}