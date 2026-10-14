using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaControls.Dto
{
   public class UpdateCoaControlInput : Abp.Application.Services.Dto.EntityDto<Guid>
    {
        public string AccountHeaderName { get; set; }
        public int MinAccount { get; set; }
        public int MaxAccount { get; set; }
        public Guid AccountGroupId { get; set; }
        public Guid ParentAccountHeaderId { get; set; }
        public int TenantId { get; set; }
    }
}
