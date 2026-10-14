using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StaffGrades.Dto
{
    public class UpdateStaffGradeInput : EntityDto<Guid>
    {
        public string Name { get; set; }
        public int TenantId { get; set; }
    }
}