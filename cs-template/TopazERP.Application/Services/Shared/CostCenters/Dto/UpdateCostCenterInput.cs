using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CostCenters.Dto
{
    public class UpdateCostCenterInput: EntityDto<Guid>
    {
        public Guid ParentId { get; set; }
        public int TenantId { get; set; }
        public string Name { get; set; }
    }
}
