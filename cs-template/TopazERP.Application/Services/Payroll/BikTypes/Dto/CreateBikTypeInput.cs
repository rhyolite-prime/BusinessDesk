using Castle.MicroKernel.SubSystems.Conversion;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.BikTypes.Dto
{
   public class CreateBikTypeInput
    {
        public string Name { get; set; }
        public Guid ExpenseAccountId { get; set; }
        public bool Taxable { get; set; }
        [Column(TypeName = "jsonb")] public List<BikRate> BikRates { get; set; }
    }
}
