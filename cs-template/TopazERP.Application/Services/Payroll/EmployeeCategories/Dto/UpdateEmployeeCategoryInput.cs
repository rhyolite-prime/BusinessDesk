using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.EmployeeCategories.Dto
{
   public class UpdateEmployeeCategoryInput: EntityDto<Guid>
    {
        public string Name { get; set; }
        public int TenantId { get; set; }

    }
}
