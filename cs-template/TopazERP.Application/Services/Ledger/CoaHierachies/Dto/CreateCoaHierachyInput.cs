using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Ledger.CoaHierachies.Dto
{
   public class CreateCoaHierachyInput
    {
        public Guid ParentId { get; set; }
        public double Ordinal { get; set; }
        public string Name { get; set; }
    }
}
