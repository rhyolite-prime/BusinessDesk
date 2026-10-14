using Abp.Application.Services.Dto;
using Castle.MicroKernel.SubSystems.Conversion;
using TopazERP.Models.Payroll;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TopazERP.Services.Payroll.OvertimeTypes.Dto
{
   public class UpdateOvertimeTypeInput:EntityDto<Guid>
    {
        public string Name { get; set; }
        public bool Taxable { get; set; }
        public List<OvertimeRate> Rates { get; set; }
        public int TenantId { get; set; }
    }
}
