using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.SalaryGrades.Dto
{
    public class SalaryNotchInput
    {
        public Guid Id { get; set; }
        public Guid SalaryGradeId { get; set; }
        public string SalaryGradeName { get; set; }
        public string Notch { get; set; }
        public int NumericalOrder { get; set; }
        
        public decimal Salary { get; set; }
    }
}
