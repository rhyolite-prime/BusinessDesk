using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.DomainServices.Payroll.EmployeeSalaryInfos.Dto
{
    public class SalaryIncrementDto
    {
        public List<SalaryIncrement> SalaryData { get; set; }
    }

    public class SalaryIncrement
    {
        public Guid EmployeeId { get; set; }
        public decimal PreviousSalary { get; set; }
        public decimal MonthlySalary { get; set; }
        public decimal IncrementAmount { get; set; }
    }
}
