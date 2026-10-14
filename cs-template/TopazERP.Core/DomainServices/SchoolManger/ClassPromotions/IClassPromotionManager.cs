using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Abp.Domain.Services;
using TopazERP.DomainServices.SchoolManger.ClassPromotions.Dto;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.ClassPromotions;

public interface IClassPromotionManager:IDomainService
{
    Task<IEnumerable<object>> ListAll();
    Task<object> Create(ClassPromotion promotion);
    Task Update(ClassPromotion promotion);
   
    
}