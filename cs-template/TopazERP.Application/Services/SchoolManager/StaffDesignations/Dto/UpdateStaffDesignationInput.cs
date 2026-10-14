using System;
using Abp.Application.Services.Dto;

namespace TopazERP.Services.SchoolManager.StaffDesignations.Dto
{
    public class UpdateStaffDesignationInput : EntityDto<Guid>
    {
        public string Name { get; set; }
        public int TenantId { get; set; }
    }
}