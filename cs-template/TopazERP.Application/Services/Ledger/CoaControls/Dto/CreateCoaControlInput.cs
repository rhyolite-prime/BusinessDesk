using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaControls.Dto
{
   public class CreateCoaControlInput
    {
        public string AccountHeaderName { get; set; }
        public int MinAccount { get; set; }
        public int MaxAccount { get; set; }
        public Guid AccountGroupId { get; set; }
        public Guid ParentAccountHeaderId { get; set; }
    }
}
