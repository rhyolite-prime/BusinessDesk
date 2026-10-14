using Abp.Application.Services.Dto;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.Gratuities.Dto
{
    public class UpdateGratuityInput:EntityDto<Guid>
    {
        public decimal MinYears { get; set; }
        public decimal MaxYears { get; set; }
        public decimal Factor { get; set; }
        public int TenantId { get; set; }
    }
}
