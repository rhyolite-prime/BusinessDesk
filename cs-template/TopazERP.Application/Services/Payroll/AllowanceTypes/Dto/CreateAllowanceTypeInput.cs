using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.AllowanceTypes.Dto
{
   public class CreateAllowanceTypeInput
    {
        public string Name { get; set; }
        public int AllowanceDays { get; set; }
        public Guid ExpenseAccountId { get; set; }
        public string ExpenseAccountName { get; set; }
        public bool Taxable { get; set; }
        public List<AllowanceRate> AllowanceRates { get; set; }
    }
}
