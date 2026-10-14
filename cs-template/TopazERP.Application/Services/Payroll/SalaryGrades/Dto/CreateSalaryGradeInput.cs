using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.SalaryGrades.Dto
{
   public class CreateSalaryGradeInput
    {
        public string Name { get; set; }
        public int NumericalOrder { get; set; }
        public List<SalaryNotch> SalaryNotches { get; set; }
    }
}
