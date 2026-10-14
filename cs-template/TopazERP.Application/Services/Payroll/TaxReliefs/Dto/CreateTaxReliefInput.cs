using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.TaxReliefs.Dto
{
   public class CreateTaxReliefInput
    {
        public string Name { get; set; }
        public decimal Amount { get; set; }
    }
}
