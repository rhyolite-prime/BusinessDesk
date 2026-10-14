using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.Departments.Dto
{
    public class UpdateDepartmentInput:EntityDto<Guid>
    {
        public Guid ParentId { get; set; }
        public int TenantId { get; set; }
        public string Name { get; set; }
    }
}
