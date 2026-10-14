using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Gratuities.Dto
{
    public class CreateGratuityInput
    {
        public decimal MinYears { get; set; }
        public decimal MaxYears { get; set; }
        public decimal Factor { get; set; }
    }
}
