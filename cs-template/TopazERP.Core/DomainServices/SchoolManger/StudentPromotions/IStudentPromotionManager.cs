using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StudentPromotions;

public interface IStudentPromotionManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(StudentPromotion studentPromotion);
    Task Update(StudentPromotion studentPromotion);
    
    //pre class
    Task<IEnumerable<object>> ListAllPreClass();
    Task<object> CreatePreClass(PreClassStudentPromotion studentPromotion);
    Task UpdatePreClass(PreClassStudentPromotion studentPromotion);
    
   
}