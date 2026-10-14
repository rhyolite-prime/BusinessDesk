using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxTables.Dto
{
   public class CreateTaxTableInput
    {
        public decimal Rate { get; set; }
        public decimal UpperLimitOfAmount { get; set; }
    }
}
