using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TopazERP.Models.Sch;

namespace TopazERP.DomainServices.SchoolManger.StaffGrades
{
    public interface IStaffGradeManager : Abp.Domain.Services.IDomainService
    {
        Task<IEnumerable<object>> ListAll();
        Task<object> Create(StaffGrade staffGrade);
        Task Update(StaffGrade staffGrade);
        Task Delete(Guid id);
    }
}