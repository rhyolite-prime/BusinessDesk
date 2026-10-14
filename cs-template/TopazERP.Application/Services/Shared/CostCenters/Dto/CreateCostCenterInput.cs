using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Shared.CostCenters.Dto
{
    public class CreateCostCenterInput
    {
        public Guid ParentId { get; set; }
        public string Name { get; set; }
    }
}
